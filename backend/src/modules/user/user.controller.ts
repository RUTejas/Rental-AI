import { Response, NextFunction } from 'express';
import fs from 'fs';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { analyzeDocumentFile, detectFileSignature, calculateFileHash, classifyComplaint } from '../../utils/ai';
import prisma from '../../config/database';

// GET /api/user/dashboard
export const getUserDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const [activeAgreement, recentDocs, recentRequests, unreadNotificationsCount] = await Promise.all([
      prisma.agreement.findFirst({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
      prisma.uploadedDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.userRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.notification.count({ where: { userId, recipientType: 'user', readStatus: false } }),
    ]);

    ApiResponse.success(res, { user: { name: user.name, email: user.email, status: user.status }, activeAgreement, recentDocs, recentRequests, unreadNotificationsCount });
  } catch (error) {
    next(error);
  }
};

// GET /api/user/profile
export const getUserProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: false, id: true, name: true, email: true, phone: true, status: true, emailVerified: true, profileDetails: true, adminId: true, createdAt: true },
    });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const admin = await prisma.admin.findFirst({
      where: { id: user.adminId, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true },
    });
    ApiResponse.success(res, { user, adminContact: admin });
  } catch (error) {
    next(error);
  }
};

// PUT /api/user/profile
export const updateUserProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const { phone, profileDetails } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(phone && { phone }), ...(profileDetails && { profileDetails }) },
    });

    await createAuditLog({
      actorId: userId, actorRole: 'user', actorEmail: user.email,
      actionType: 'USER_PROFILE_UPDATED', targetTable: 'User', targetRecordId: userId,
      newValue: { phone, profileDetails }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/user/property
export const getUserProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    // Find a rental record or agreement to determine the property
    const rentalRecord = await prisma.rentalRecord.findFirst({
      where: { userId, status: 'active' },
      include: { property: true },
    });
    if (!rentalRecord) { ApiResponse.notFound(res, 'No property assigned to this user'); return; }

    const admin = await prisma.admin.findFirst({
      where: { id: rentalRecord.adminId, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true },
    });
    ApiResponse.success(res, { property: rentalRecord.property, adminContact: admin });
  } catch (error) {
    next(error);
  }
};

// GET /api/user/agreement
export const getUserAgreement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const agreement = await prisma.agreement.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!agreement) { ApiResponse.notFound(res, 'No agreement found for this user'); return; }
    ApiResponse.success(res, agreement);
  } catch (error) {
    next(error);
  }
};

// POST /api/user/agreement/:id/accept
export const acceptUserAgreement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const agreement = await prisma.agreement.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }

    if (!['Sent to User', 'Viewed by User'].includes(agreement.status)) {
      ApiResponse.badRequest(res, 'Agreement is not in a state to be accepted');
      return;
    }

    const clientInfo = getClientInfo(req);
    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'Accepted by User',
        digitalAcceptanceStatus: 'Accepted',
        acceptedAt: new Date(),
        acceptedIp: clientInfo.ipAddress,
        acceptedDevice: clientInfo.deviceInfo,
      },
    });

    await createAuditLog({
      actorId: userId, actorRole: 'user', actorEmail: user.email,
      actionType: 'AGREEMENT_ACCEPTED', targetTable: 'Agreement', targetRecordId: agreement.id,
      newValue: { status: 'Accepted by User' }, ...clientInfo, status: 'success',
    });

    await prisma.notification.create({
      data: {
        recipientId: agreement.adminId, recipientType: 'admin', adminId: agreement.adminId,
        title: 'Agreement Accepted', message: `Tenant ${user.name} has digitally accepted the agreement.`, type: 'success',
      },
    });

    ApiResponse.success(res, updated, 'Agreement digitally accepted successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/user/documents
export const getUserDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const documents = await prisma.uploadedDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    ApiResponse.success(res, documents);
  } catch (error) {
    next(error);
  }
};

// POST /api/user/documents
export const uploadUserDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    if (!req.file) { ApiResponse.badRequest(res, 'No file uploaded'); return; }

    const { documentType } = req.body;
    if (!documentType) {
      fs.unlinkSync(req.file.path);
      ApiResponse.badRequest(res, 'documentType is required');
      return;
    }

    const fileBuffer = fs.readFileSync(req.file.path);

    // File signature validation
    const sig = detectFileSignature(fileBuffer);
    if (!sig) {
      fs.unlinkSync(req.file.path);
      ApiResponse.badRequest(res, 'Invalid file signature. Only PDF, JPG, JPEG, and PNG are allowed.');
      return;
    }

    // Duplicate check via hash
    const fileHash = calculateFileHash(fileBuffer);
    const duplicate = await prisma.uploadedDocument.findFirst({ where: { secureFileName: fileHash, userId } });
    if (duplicate) {
      fs.unlinkSync(req.file.path);
      ApiResponse.badRequest(res, 'This file has already been uploaded.');
      return;
    }

    // AI Document Intelligence
    const aiAnalysis = await analyzeDocumentFile(fileBuffer, documentType);

    const doc = await prisma.uploadedDocument.create({
      data: {
        uploaderId: userId,
        uploaderType: 'user',
        userId,
        adminId: user.adminId,
        documentType,
        originalName: req.file.originalname,
        secureFileName: req.file.filename,
        fileUrl: `/api/documents/file/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'Pending Verification',
        aiSummary: JSON.stringify(aiAnalysis),
      },
    });

    await createAuditLog({
      actorId: userId, actorRole: 'user', actorEmail: user.email,
      actionType: 'DOCUMENT_UPLOADED', targetTable: 'UploadedDocument', targetRecordId: doc.id,
      newValue: { documentType, secureFileName: doc.secureFileName },
      ...getClientInfo(req), status: 'success',
    });

    await prisma.notification.create({
      data: {
        recipientId: user.adminId, recipientType: 'admin', adminId: user.adminId,
        title: 'Document Uploaded', message: `Tenant ${user.name} uploaded ${documentType} for verification.`, type: 'action',
      },
    });

    ApiResponse.success(res, doc, 'Document uploaded and sent for verification');
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

// GET /api/user/requests
export const getUserRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const requests = await prisma.userRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    ApiResponse.success(res, requests);
  } catch (error) {
    next(error);
  }
};

// POST /api/user/requests
export const createUserRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) { ApiResponse.notFound(res, 'User not found'); return; }

    const { description } = req.body;
    if (!description) { ApiResponse.badRequest(res, 'description is required'); return; }

    const aiAnalysis = await classifyComplaint(description);

    const request = await prisma.userRequest.create({
      data: {
        adminId: user.adminId,
        userId,
        category: aiAnalysis.category,
        priority: aiAnalysis.priority,
        description,
        status: 'Pending',
      },
    });

    await createAuditLog({
      actorId: userId, actorRole: 'user', actorEmail: user.email,
      actionType: 'REQUEST_CREATED', targetTable: 'UserRequest', targetRecordId: request.id,
      newValue: { category: request.category, priority: request.priority },
      ...getClientInfo(req), status: 'success',
    });

    await prisma.notification.create({
      data: {
        recipientId: user.adminId, recipientType: 'admin', adminId: user.adminId,
        title: 'New Maintenance Request', message: `Tenant ${user.name} raised a ${request.priority} priority ${request.category} request.`, type: 'action',
      },
    });

    ApiResponse.success(res, request, 'Request raised and categorized by AI');
  } catch (error) {
    next(error);
  }
};

// GET /api/user/notifications
export const getUserNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId, recipientType: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId, recipientType: 'user', readStatus: false } });
    ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/user/notifications/:id/read
export const markUserNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { readStatus: true },
    });
    ApiResponse.success(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/user/documents/:id
export const deleteUserDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const doc = await prisma.uploadedDocument.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
    if (!doc) { ApiResponse.notFound(res, 'Document not found'); return; }

    if (doc.status === 'Approved') {
      ApiResponse.badRequest(res, 'Cannot delete an approved document');
      return;
    }

    // Soft delete
    await prisma.uploadedDocument.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });

    ApiResponse.success(res, null, 'Document deleted');
  } catch (error) {
    next(error);
  }
};

