import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { config } from '../../config/env';
import prisma from '../../config/database';

// GET /api/admin/dashboard
export const getAdminDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.user!.id;
    const [
      myUsers, activeUsers,
      myProperties,
      myRentals, activeRentals,
      myAgreements, pendingAgreements, acceptedAgreements,
      myDocuments, pendingDocs, approvedDocs, rejectedDocs,
      myRequests, pendingRequests,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { adminId, deletedAt: null } }),
      prisma.user.count({ where: { adminId, status: 'active', deletedAt: null } }),
      prisma.property.count({ where: { adminId, deletedAt: null } }),
      prisma.rentalRecord.count({ where: { adminId } }),
      prisma.rentalRecord.count({ where: { adminId, status: 'active' } }),
      prisma.agreement.count({ where: { adminId, deletedAt: null } }),
      prisma.agreement.count({ where: { adminId, status: 'Sent to User', deletedAt: null } }),
      prisma.agreement.count({ where: { adminId, status: 'Accepted by User', deletedAt: null } }),
      prisma.uploadedDocument.count({ where: { adminId } }),
      prisma.uploadedDocument.count({ where: { adminId, status: 'Pending Verification' } }),
      prisma.uploadedDocument.count({ where: { adminId, status: 'Approved' } }),
      prisma.uploadedDocument.count({ where: { adminId, status: 'Rejected' } }),
      prisma.userRequest.count({ where: { adminId } }),
      prisma.userRequest.count({ where: { adminId, status: 'Pending' } }),
      prisma.user.findMany({
        where: { adminId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, status: true, createdAt: true },
      }),
    ]);

    ApiResponse.success(res, {
      users: { total: myUsers, active: activeUsers },
      properties: { total: myProperties },
      rentals: { total: myRentals, active: activeRentals },
      agreements: { total: myAgreements, pending: pendingAgreements, accepted: acceptedAgreements },
      documents: { total: myDocuments, pending: pendingDocs, approved: approvedDocs, rejected: rejectedDocs },
      requests: { total: myRequests, pending: pendingRequests },
      recentUsers,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
export const getMyUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { adminId: req.user!.id, deletedAt: null };
    if (status) where.status = String(status);
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit), select: { passwordHash: false, id: true, name: true, email: true, phone: true, status: true, adminId: true, createdAt: true, updatedAt: true } }),
      prisma.user.count({ where }),
    ]);
    ApiResponse.success(res, { users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) { ApiResponse.badRequest(res, 'Email already registered'); return; }

    const passwordHash = await bcrypt.hash('TempPassword@123', config.bcryptRounds);
    const user = await prisma.user.create({
      data: { adminId: req.user!.id, name, email: email.toLowerCase(), phone, passwordHash, emailVerified: true, status: 'active' },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'USER_CREATED', targetTable: 'User', targetRecordId: user.id,
      newValue: { name, email, phone }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.created(res, { id: user.id, name, email }, 'User created. Temporary password: TempPassword@123');
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const { name, phone, status } = req.body;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { ...(name && { name }), ...(phone && { phone }), ...(status && { status }) },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'USER_UPDATED', targetTable: 'User', targetRecordId: user.id,
      oldValue: { name: user.name, phone: user.phone, status: user.status }, newValue: req.body,
      ...getClientInfo(req), status: 'success',
    });
    ApiResponse.success(res, updated, 'User updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id (soft delete)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }
    await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
    ApiResponse.success(res, null, 'User deleted');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/properties
export const getMyProperties = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { adminId: req.user!.id, deletedAt: null };
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { address: { contains: String(search), mode: 'insensitive' } },
    ];
    const [properties, total] = await Promise.all([
      prisma.property.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.property.count({ where }),
    ]);
    ApiResponse.success(res, { properties, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/properties
export const createProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, address, roomNumber } = req.body;
    const property = await prisma.property.create({
      data: { adminId: req.user!.id, name, address, roomNumber },
    });
    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'PROPERTY_CREATED', targetTable: 'Property', targetRecordId: property.id,
      newValue: req.body, ...getClientInfo(req), status: 'success',
    });
    ApiResponse.created(res, property, 'Property created');
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/properties/:id
export const updateProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await prisma.property.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!property) { ApiResponse.notFound(res, 'Property not found'); return; }
    const { name, address, roomNumber } = req.body;
    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { ...(name && { name }), ...(address && { address }), ...(roomNumber !== undefined && { roomNumber }) },
    });
    ApiResponse.success(res, updated, 'Property updated');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/requests
export const getMyRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', category = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { adminId: req.user!.id };
    if (status) where.status = String(status);
    if (category) where.category = String(category);
    const [requests, total] = await Promise.all([
      prisma.userRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit), include: { user: { select: { id: true, name: true, email: true } } } }),
      prisma.userRequest.count({ where }),
    ]);
    ApiResponse.success(res, { requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/requests/:id
export const updateRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = await prisma.userRequest.findFirst({ where: { id: req.params.id, adminId: req.user!.id } });
    if (!request) { ApiResponse.notFound(res, 'Request not found'); return; }

    const { status, category, priority } = req.body;
    const updated = await prisma.userRequest.update({
      where: { id: request.id },
      data: { ...(status && { status }), ...(category && { category }), ...(priority && { priority }) },
    });

    await prisma.notification.create({
      data: {
        recipientId: request.userId, recipientType: 'user', userId: request.userId,
        title: 'Request Update', message: `Your request status has been updated to: ${status || request.status}`, type: 'info',
      },
    });
    ApiResponse.success(res, updated, 'Request updated');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/notifications
export const getAdminNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user?.id, recipientType: 'admin' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { recipientId: req.user?.id, recipientType: 'admin', readStatus: false },
    });
    ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/notifications/:id/read
export const markAdminNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { readStatus: true } });
    ApiResponse.success(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};