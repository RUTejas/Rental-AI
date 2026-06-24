import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { classifyComplaint } from '../../utils/ai';
import prisma from '../../config/database';

// GET /api/requests
export const getAllRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', category = '', priority = '', userId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };

    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    if (status) where.status = String(status);
    if (category) where.category = String(category);
    if (priority) where.priority = String(priority);
    if (userId && req.user!.role !== 'user') where.userId = String(userId);

    const [requests, total] = await Promise.all([
      prisma.userRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          admin: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.userRequest.count({ where }),
    ]);

    ApiResponse.success(res, { requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/:id
export const getRequestDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const request = await prisma.userRequest.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) { ApiResponse.notFound(res, 'Request not found'); return; }
    ApiResponse.success(res, request);
  } catch (error) {
    next(error);
  }
};

// POST /api/requests
export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role !== 'user') { ApiResponse.forbidden(res, 'Only tenants can create requests'); return; }

    const { description } = req.body;
    if (!description) { ApiResponse.badRequest(res, 'Description is required'); return; }

    const user = await prisma.user.findFirst({ where: { id: req.user!.id, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const aiAnalysis = await classifyComplaint(description);

    const request = await prisma.userRequest.create({
      data: {
        adminId: user.adminId,
        userId: user.id,
        category: aiAnalysis.category,
        description,
        priority: aiAnalysis.priority,
        status: 'Pending',
      },
    });

    await createAuditLog({
      actorId: user.id, actorRole: 'user', actorEmail: user.email,
      actionType: 'REQUEST_CREATED', targetTable: 'UserRequest', targetRecordId: request.id,
      newValue: { description, category: request.category, priority: request.priority },
      ...getClientInfo(req), status: 'success',
    });

    await prisma.notification.create({
      data: {
        recipientId: user.adminId, recipientType: 'admin', adminId: user.adminId,
        title: 'New Maintenance Request', message: `Tenant ${user.name} raised a ${request.priority} priority ${request.category} request.`, type: 'action',
      },
    });

    ApiResponse.created(res, request, 'Request raised and classified by AI');
  } catch (error) {
    next(error);
  }
};

// PUT /api/requests/:id
export const updateRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const request = await prisma.userRequest.findFirst({ where });
    if (!request) { ApiResponse.notFound(res, 'Request not found'); return; }

    const oldStatus = request.status;
    const oldPriority = request.priority;
    const oldCategory = request.category;
    let dataToUpdate: any = {};

    if (req.user!.role === 'user') {
      if (request.status !== 'Pending') { ApiResponse.badRequest(res, 'Cannot edit request description once it is viewed or processed'); return; }
      if (req.body.description) {
        dataToUpdate.description = req.body.description;
        const aiAnalysis = await classifyComplaint(req.body.description);
        dataToUpdate.category = aiAnalysis.category;
        dataToUpdate.priority = aiAnalysis.priority;
      }
    } else {
      const { status, priority, category } = req.body;
      if (status) dataToUpdate.status = status;
      if (priority) dataToUpdate.priority = priority;
      if (category) dataToUpdate.category = category;

      if (status) {
        await prisma.notification.create({
          data: {
            recipientId: request.userId, recipientType: 'user', userId: request.userId,
            title: 'Request Status Updated',
            message: `Your request regarding ${request.category} has been updated to ${status}.`,
            type: 'info',
          },
        });
      }
    }

    const updated = await prisma.userRequest.update({ where: { id: request.id }, data: dataToUpdate });

    await createAuditLog({
      actorId: req.user!.id, actorRole: req.user!.role as any, actorEmail: req.user!.email,
      actionType: 'REQUEST_UPDATED', targetTable: 'UserRequest', targetRecordId: request.id,
      oldValue: { status: oldStatus, priority: oldPriority, category: oldCategory }, newValue: req.body,
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, updated, 'Request updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/requests/:id
export const deleteRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') {
      where.userId = req.user!.id;
      const request = await prisma.userRequest.findFirst({ where });
      if (request && request.status !== 'Pending') { ApiResponse.badRequest(res, 'Cannot delete request once processed'); return; }
    }

    const request = await prisma.userRequest.findFirst({ where });
    if (!request) { ApiResponse.notFound(res, 'Request not found'); return; }

    await prisma.userRequest.update({ where: { id: request.id }, data: { deletedAt: new Date() } });

    ApiResponse.success(res, null, 'Request deleted');
  } catch (error) {
    next(error);
  }
};
