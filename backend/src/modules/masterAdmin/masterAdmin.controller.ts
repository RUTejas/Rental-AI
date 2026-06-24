import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { sendEmail, emailTemplates } from '../../utils/email';
import { config } from '../../config/env';
import prisma from '../../config/database';

// GET /api/master/dashboard
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalAdmins, approvedAdmins, pendingAdmins, suspendedAdmins,
      totalUsers, totalProperties, totalRentalRecords, activeRentals,
      totalAgreements, agreementsPending, agreementsAccepted,
      totalDocuments, approvedDocuments, rejectedDocuments, pendingDocuments,
      totalRequests, resolvedRequests,
      recentAdmins, recentUsers,
    ] = await Promise.all([
      prisma.admin.count({ where: { deletedAt: null } }),
      prisma.admin.count({ where: { status: 'APPROVED', deletedAt: null } }),
      prisma.admin.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.admin.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.rentalRecord.count(),
      prisma.rentalRecord.count({ where: { status: 'active' } }),
      prisma.agreement.count({ where: { deletedAt: null } }),
      prisma.agreement.count({ where: { status: 'Sent to User', deletedAt: null } }),
      prisma.agreement.count({ where: { status: 'Accepted by User', deletedAt: null } }),
      prisma.uploadedDocument.count(),
      prisma.uploadedDocument.count({ where: { status: 'Approved' } }),
      prisma.uploadedDocument.count({ where: { status: 'Rejected' } }),
      prisma.uploadedDocument.count({ where: { status: 'Pending Verification' } }),
      prisma.userRequest.count(),
      prisma.userRequest.count({ where: { status: 'Resolved' } }),
      prisma.admin.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, status: true, createdAt: true } }),
      prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, status: true, createdAt: true } }),
    ]);

    ApiResponse.success(res, {
      admins: { total: totalAdmins, approved: approvedAdmins, pending: pendingAdmins, suspended: suspendedAdmins },
      users: { total: totalUsers },
      properties: { total: totalProperties },
      rentalRecords: { total: totalRentalRecords, active: activeRentals },
      agreements: { total: totalAgreements, pending: agreementsPending, accepted: agreementsAccepted },
      documents: { total: totalDocuments, approved: approvedDocuments, rejected: rejectedDocuments, pending: pendingDocuments },
      requests: { total: totalRequests, resolved: resolvedRequests },
      recentAdmins, recentUsers,
    }, 'Dashboard stats fetched');
  } catch (error) {
    next(error);
  }
};

// GET /api/master/admins
export const getAllAdmins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', status = '', includeDeleted = 'false' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (includeDeleted !== 'true') where.deletedAt = null;
    if (status) where.status = status;
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];

    const [admins, total] = await Promise.all([
      prisma.admin.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit), select: { passwordHash: false, id: true, name: true, email: true, phone: true, status: true, emailVerified: true, createdAt: true, updatedAt: true, deletedAt: true } }),
      prisma.admin.count({ where }),
    ]);

    ApiResponse.success(res, { admins, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/master/admins/:id/approve
export const approveAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) { ApiResponse.notFound(res, 'Admin not found'); return; }

    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { status: 'APPROVED' },
    });

    await sendEmail({ to: admin.email, ...emailTemplates.adminApproved(admin.name, config.frontendUrl) });
    await createAuditLog({
      actorId: req.user!.id, actorRole: 'master_admin', actorEmail: req.user!.email,
      actionType: 'ADMIN_APPROVED', targetTable: 'Admin', targetRecordId: admin.id,
      oldValue: { status: admin.status }, newValue: { status: 'APPROVED' },
      ...getClientInfo(req), status: 'success',
    });
    await prisma.notification.create({
      data: {
        recipientId: admin.id, recipientType: 'admin', adminId: admin.id,
        title: 'Account Approved', message: 'Your admin account has been approved. You can now login.', type: 'success',
      },
    });

    ApiResponse.success(res, { id: admin.id, status: updated.status }, 'Admin approved successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/master/admins/:id/reject
export const rejectAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) { ApiResponse.notFound(res, 'Admin not found'); return; }

    await prisma.admin.update({ where: { id: admin.id }, data: { status: 'SUSPENDED' } });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'master_admin', actorEmail: req.user!.email,
      actionType: 'ADMIN_REJECTED', targetTable: 'Admin', targetRecordId: admin.id,
      newValue: { status: 'SUSPENDED', reason }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, null, 'Admin rejected');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/master/admins/:id/suspend
export const suspendAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) { ApiResponse.notFound(res, 'Admin not found'); return; }

    const newStatus = admin.status === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';
    await prisma.admin.update({ where: { id: admin.id }, data: { status: newStatus } });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'master_admin', actorEmail: req.user!.email,
      actionType: newStatus === 'SUSPENDED' ? 'ADMIN_SUSPENDED' : 'ADMIN_RESTORED',
      targetTable: 'Admin', targetRecordId: admin.id,
      oldValue: { status: admin.status }, newValue: { status: newStatus },
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, { status: newStatus }, `Admin ${newStatus === 'SUSPENDED' ? 'suspended' : 'restored'}`);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/master/admins/:id (soft delete)
export const deleteAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) { ApiResponse.notFound(res, 'Admin not found'); return; }

    await prisma.admin.update({ where: { id: admin.id }, data: { deletedAt: new Date() } });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'master_admin', actorEmail: req.user!.email,
      actionType: 'ADMIN_DELETED', targetTable: 'Admin', targetRecordId: admin.id,
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, null, 'Admin soft-deleted');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/master/admins/:id/restore
export const restoreAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, NOT: { deletedAt: null } } });
    if (!admin) { ApiResponse.notFound(res, 'Admin not found or not deleted'); return; }

    await prisma.admin.update({ where: { id: admin.id }, data: { deletedAt: null, status: 'APPROVED' } });

    ApiResponse.success(res, null, 'Admin restored');
  } catch (error) {
    next(error);
  }
};

// GET /api/master/users
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', adminId = '', status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (adminId) where.adminId = String(adminId);
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit), select: { passwordHash: false, id: true, name: true, email: true, phone: true, status: true, adminId: true, createdAt: true, updatedAt: true } }),
      prisma.user.count({ where }),
    ]);

    ApiResponse.success(res, { users, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/master/properties
export const getAllProperties = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', adminId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };
    if (adminId) where.adminId = String(adminId);
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { address: { contains: String(search), mode: 'insensitive' } },
    ];
    const [properties, total] = await Promise.all([
      prisma.property.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit), include: { admin: { select: { id: true, name: true, email: true } } } }),
      prisma.property.count({ where }),
    ]);
    ApiResponse.success(res, { properties, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
};

// GET /api/master/audit-logs
export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 50, actionType = '', actorRole = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (actionType) where.action = { contains: String(actionType), mode: 'insensitive' };
    if (actorRole) where.actorType = String(actorRole);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip, take: Number(limit) }),
      prisma.auditLog.count({ where }),
    ]);

    ApiResponse.success(res, { logs, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/master/login-activity
export const getLoginActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 50, role = '', status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { action: { contains: 'LOGIN' } };
    if (role) where.actorType = String(role);
    if (status) where.status = String(status);

    const [activity, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip, take: Number(limit) }),
      prisma.auditLog.count({ where }),
    ]);

    ApiResponse.success(res, { activity, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/master/analytics
export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Admin-wise user counts using Prisma groupBy
    const adminUserDist = await prisma.user.groupBy({
      by: ['adminId'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    // Agreement status distribution
    const agreementStatusRaw = await prisma.agreement.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    // Document status distribution
    const documentStatusRaw = await prisma.uploadedDocument.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    ApiResponse.success(res, {
      adminUserDist: adminUserDist.map(d => ({ adminId: d.adminId, userCount: d._count.id })),
      agreementStatus: agreementStatusRaw.map(d => ({ status: d.status, count: d._count.id })),
      documentStatus: documentStatusRaw.map(d => ({ status: d.status, count: d._count.id })),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/master/users/:userId/transfer
export const transferUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { newAdminId } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.params.userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const newAdmin = await prisma.admin.findFirst({ where: { id: newAdminId, status: 'APPROVED', deletedAt: null } });
    if (!newAdmin) { ApiResponse.notFound(res, 'Target admin not found'); return; }

    const oldAdminId = user.adminId;
    await prisma.user.update({ where: { id: user.id }, data: { adminId: newAdminId } });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'master_admin', actorEmail: req.user!.email,
      actionType: 'USER_TRANSFERRED', targetTable: 'User', targetRecordId: user.id,
      oldValue: { adminId: oldAdminId }, newValue: { adminId: newAdminId },
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, null, 'User transferred successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/master/notifications
export const getMasterNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user?.id, recipientType: 'master_admin' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { recipientId: req.user?.id, recipientType: 'master_admin', readStatus: false },
    });
    ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/master/notifications/:id/read
export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { readStatus: true } });
    ApiResponse.success(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};
