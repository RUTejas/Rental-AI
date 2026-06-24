import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { config } from '../../config/env';
import prisma from '../../config/database';

// GET /api/documents
export const getAllDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', documentType = '', userId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    if (status) where.status = String(status);
    if (documentType) where.documentType = String(documentType);
    if (userId) where.userId = String(userId);

    const [documents, total] = await Promise.all([
      prisma.uploadedDocument.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: { userUploader: { select: { id: true, name: true, email: true } } },
      }),
      prisma.uploadedDocument.count({ where }),
    ]);

    ApiResponse.success(res, { documents, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/documents/:id
export const getDocumentDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const doc = await prisma.uploadedDocument.findFirst({
      where,
      include: { userUploader: { select: { id: true, name: true, email: true, status: true } } },
    });
    if (!doc) { ApiResponse.notFound(res, 'Document not found'); return; }
    ApiResponse.success(res, doc);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/documents/:id/verify
export const verifyDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, rejectionReason } = req.body;
    const validStatuses = ['Approved', 'Rejected', 'Re-upload Required'];
    if (!validStatuses.includes(status)) {
      ApiResponse.badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      return;
    }

    const where: any = { id: req.params.id };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;

    const doc = await prisma.uploadedDocument.findFirst({ where });
    if (!doc) { ApiResponse.notFound(res, 'Document not found'); return; }

    const oldStatus = doc.status;
    const updated = await prisma.uploadedDocument.update({
      where: { id: doc.id },
      data: { status, ...(rejectionReason && { rejectionReason }) },
    });

    if (doc.userId) {
      await prisma.notification.create({
        data: {
          recipientId: doc.userId, recipientType: 'user', userId: doc.userId,
          title: `Document ${status}`,
          message: `Your uploaded ${doc.documentType} has been ${status}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
          type: status === 'Approved' ? 'success' : 'info',
        },
      });
    }

    await createAuditLog({
      actorId: req.user!.id, actorRole: req.user!.role as any, actorEmail: req.user!.email,
      actionType: 'DOCUMENT_VERIFIED', targetTable: 'UploadedDocument', targetRecordId: doc.id,
      oldValue: { status: oldStatus }, newValue: { status, rejectionReason },
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, updated, `Document status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

// GET /api/documents/file/:filename (Secure file serve)
export const serveDocumentFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    const doc = await prisma.uploadedDocument.findFirst({ where: { secureFileName: filename } });
    if (!doc) { ApiResponse.notFound(res, 'File not found'); return; }

    let authorized = false;
    if (req.user!.role === 'master_admin') authorized = true;
    else if (req.user!.role === 'admin' && doc.adminId === req.user!.id) authorized = true;
    else if (req.user!.role === 'user' && doc.userId === req.user!.id) authorized = true;

    if (!authorized) { ApiResponse.forbidden(res, 'Not authorized to access this file'); return; }

    const filePath = path.join(__dirname, '../../../', config.uploadDir, 'documents', filename);
    if (!fs.existsSync(filePath)) { ApiResponse.notFound(res, 'File does not exist on disk'); return; }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
