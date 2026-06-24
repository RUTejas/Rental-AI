import { Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { analyzeAgreementText } from '../../utils/ai';
import prisma from '../../config/database';

// GET /api/agreements
export const getAllAgreements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', userId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };

    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    if (req.user!.role === 'user') where.userId = req.user!.id;
    if (status) where.status = String(status);
    if (userId) where.userId = String(userId);

    const [agreements, total] = await Promise.all([
      prisma.agreement.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: { user: { select: { id: true, name: true, email: true } }, property: { select: { id: true, name: true, address: true } } },
      }),
      prisma.agreement.count({ where }),
    ]);

    ApiResponse.success(res, { agreements, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/agreements/:id
export const getAgreementDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const agreement = await prisma.agreement.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, name: true, address: true, roomNumber: true } },
      },
    });

    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }
    ApiResponse.success(res, agreement);
  } catch (error) {
    next(error);
  }
};

// POST /api/agreements
export const createAgreement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      userId, propertyId, rentAmountInfo, depositAmountInfo,
      maintenanceRules, noticePeriod, lockInPeriod, houseRules, termsAndConditions, expiryDate,
    } = req.body;

    const [property, user] = await Promise.all([
      prisma.property.findFirst({ where: { id: propertyId, adminId: req.user!.id, deletedAt: null } }),
      prisma.user.findFirst({ where: { id: userId, adminId: req.user!.id, deletedAt: null } }),
    ]);

    if (!property) { ApiResponse.notFound(res, 'Property not found'); return; }
    if (!user) { ApiResponse.notFound(res, 'User/Tenant not found'); return; }

    const textToAnalyze = `Rules: ${houseRules || ''}\nTerms: ${termsAndConditions || ''}\nMaintenance: ${maintenanceRules || ''}`;
    const aiAnalysis = await analyzeAgreementText(textToAnalyze);

    const agreement = await prisma.agreement.create({
      data: {
        adminId: req.user!.id,
        userId,
        propertyId,
        rentAmountInfo: parseFloat(rentAmountInfo) || 0,
        depositAmountInfo: parseFloat(depositAmountInfo) || 0,
        maintenanceRules, noticePeriod, lockInPeriod, houseRules, termsAndConditions,
        clauses: aiAnalysis as any,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status: 'Draft',
      },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'AGREEMENT_CREATED', targetTable: 'Agreement', targetRecordId: agreement.id,
      newValue: { userId, propertyId }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.created(res, agreement, 'Agreement drafted successfully');
  } catch (error) {
    next(error);
  }
};

// PUT /api/agreements/:id
export const updateAgreement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agreement = await prisma.agreement.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }

    if (!['Draft', 'Rejected'].includes(agreement.status)) {
      ApiResponse.badRequest(res, 'Cannot edit an agreement that has been sent or accepted');
      return;
    }

    const { houseRules, termsAndConditions, maintenanceRules, noticePeriod, lockInPeriod } = req.body;
    let clauses = agreement.clauses;
    if (houseRules || termsAndConditions) {
      const textToAnalyze = `Rules: ${houseRules || ''}\nTerms: ${termsAndConditions || ''}`;
      clauses = await analyzeAgreementText(textToAnalyze) as any;
    }

    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        ...(houseRules && { houseRules }),
        ...(termsAndConditions && { termsAndConditions }),
        ...(maintenanceRules && { maintenanceRules }),
        ...(noticePeriod && { noticePeriod }),
        ...(lockInPeriod && { lockInPeriod }),
        clauses,
        agreementVersion: { increment: 1 },
      },
    });

    ApiResponse.success(res, updated, 'Agreement updated successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/agreements/:id/send
export const sendAgreementToUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agreement = await prisma.agreement.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }

    await prisma.agreement.update({ where: { id: agreement.id }, data: { status: 'Sent to User' } });

    await prisma.notification.create({
      data: {
        recipientId: agreement.userId, recipientType: 'user', userId: agreement.userId,
        title: 'New E-Agreement Received', message: 'Your lease agreement is ready for digital signature.', type: 'action',
      },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'AGREEMENT_SENT', targetTable: 'Agreement', targetRecordId: agreement.id,
      newValue: { status: 'Sent to User' }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, null, 'Agreement sent to user for acceptance');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/agreements/:id/verify
export const verifyAgreement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, reason } = req.body;
    if (!['Approved by Admin', 'Rejected'].includes(status)) {
      ApiResponse.badRequest(res, 'Invalid status. Must be "Approved by Admin" or "Rejected".');
      return;
    }

    const agreement = await prisma.agreement.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }

    if (agreement.status !== 'Accepted by User') {
      ApiResponse.badRequest(res, 'Agreement has not been signed by tenant yet');
      return;
    }

    await prisma.agreement.update({ where: { id: agreement.id }, data: { status } });

    if (status === 'Approved by Admin') {
      // Create Rental Record on approval
      await prisma.rentalRecord.create({
        data: {
          adminId: agreement.adminId,
          userId: agreement.userId,
          propertyId: agreement.propertyId,
          startDate: new Date(),
          endDate: agreement.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
      });
    }

    await prisma.notification.create({
      data: {
        recipientId: agreement.userId, recipientType: 'user', userId: agreement.userId,
        title: status === 'Approved by Admin' ? 'Agreement Approved' : 'Agreement Rejected',
        message: status === 'Approved by Admin'
          ? 'Your agreement has been finalized by the admin.'
          : `Your agreement was rejected.${reason ? ' Reason: ' + reason : ''}`,
        type: status === 'Approved by Admin' ? 'success' : 'info',
      },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: status === 'Approved by Admin' ? 'AGREEMENT_APPROVED' : 'AGREEMENT_REJECTED',
      targetTable: 'Agreement', targetRecordId: agreement.id,
      oldValue: { status: agreement.status }, newValue: { status },
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, null, `Agreement ${status === 'Approved by Admin' ? 'approved' : 'rejected'}`);
  } catch (error) {
    next(error);
  }
};

// GET /api/agreements/:id/pdf
export const downloadAgreementPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const agreement = await prisma.agreement.findFirst({
      where,
      include: {
        user: { select: { name: true, email: true } },
        property: { select: { name: true, address: true, roomNumber: true } },
      },
    });
    if (!agreement) { ApiResponse.notFound(res, 'Agreement not found'); return; }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Agreement_${agreement.id}.pdf`);
    doc.pipe(res);

    doc.fillColor('#C89B5E').fontSize(24).font('Helvetica-Bold').text('RentWise AI', { align: 'center' });
    doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text('AI-Enabled Rental Management Platform', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#0B1117').fontSize(16).font('Helvetica-Bold').text('RESIDENTIAL LEASE AGREEMENT', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F3D35').text('Agreement Details:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#121A22');
    doc.text(`Property: ${agreement.property?.name}`);
    doc.text(`Address: ${agreement.property?.address}`);
    doc.text(`Tenant: ${agreement.user?.name} (${agreement.user?.email})`);
    doc.text(`Status: ${agreement.status.toUpperCase()}`);
    doc.text(`Rent Info: ${agreement.rentAmountInfo}`);
    doc.text(`Deposit Info: ${agreement.depositAmountInfo}`);
    doc.text(`Notice Period: ${agreement.noticePeriod || 'N/A'}`);
    doc.text(`Lock-in Period: ${agreement.lockInPeriod || 'N/A'}`);
    doc.moveDown(1.5);

    if (agreement.houseRules) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F3D35').text('House Rules:');
      doc.fontSize(10).font('Helvetica').fillColor('#121A22').text(agreement.houseRules, { align: 'justify' });
      doc.moveDown(1);
    }

    if (agreement.termsAndConditions) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F3D35').text('Terms & Conditions:');
      doc.fontSize(10).font('Helvetica').fillColor('#121A22').text(agreement.termsAndConditions, { align: 'justify' });
      doc.moveDown(1.5);
    }

    doc.strokeColor('#E8DCC8').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    if (agreement.digitalAcceptanceStatus === 'Accepted') {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#2F7D5C').text('✓ SIGNED DIGITALLY VIA RENTWISE AI SECURE PORTAL', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').fillColor('#6B7280');
      doc.text(`Timestamp: ${agreement.acceptedAt ? new Date(agreement.acceptedAt).toUTCString() : 'N/A'}`, { align: 'center' });
      doc.text(`IP Address: ${agreement.acceptedIp || 'N/A'}`, { align: 'center' });
      doc.text(`Device/Browser: ${agreement.acceptedDevice || 'N/A'}`, { align: 'center' });
    } else {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#D97706').text('PENDING DIGITAL ACCEPTANCE BY TENANT', { align: 'center' });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
