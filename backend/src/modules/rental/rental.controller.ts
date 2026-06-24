import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import prisma from '../../config/database';

// GET /api/rentals
export const getAllRentals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', userId = '', propertyId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };

    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    if (req.user!.role === 'user') where.userId = req.user!.id;
    if (status) where.status = String(status);
    if (userId) where.userId = String(userId);
    if (propertyId) where.propertyId = String(propertyId);

    const [rentals, total] = await Promise.all([
      prisma.rentalRecord.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: {
          user: { select: { id: true, name: true, email: true, status: true } },
          property: { select: { id: true, name: true, address: true } },
        },
      }),
      prisma.rentalRecord.count({ where }),
    ]);

    ApiResponse.success(res, { rentals, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

// GET /api/rentals/:id
export const getRentalDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id, deletedAt: null };
    if (req.user!.role === 'admin') where.adminId = req.user!.id;
    else if (req.user!.role === 'user') where.userId = req.user!.id;

    const rental = await prisma.rentalRecord.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, name: true, address: true, roomNumber: true } },
      },
    });

    if (!rental) { ApiResponse.notFound(res, 'Rental record not found'); return; }
    ApiResponse.success(res, rental);
  } catch (error) {
    next(error);
  }
};

// POST /api/rentals
export const createRentalRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, propertyId, startDate, endDate } = req.body;

    const [property, user] = await Promise.all([
      prisma.property.findFirst({ where: { id: propertyId, adminId: req.user!.id, deletedAt: null } }),
      prisma.user.findFirst({ where: { id: userId, adminId: req.user!.id, deletedAt: null } }),
    ]);

    if (!property) { ApiResponse.notFound(res, 'Property not found'); return; }
    if (!user) { ApiResponse.notFound(res, 'User/Tenant not found'); return; }

    const rental = await prisma.rentalRecord.create({
      data: {
        adminId: req.user!.id,
        userId,
        propertyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'active',
      },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'RENTAL_RECORD_CREATED', targetTable: 'RentalRecord', targetRecordId: rental.id,
      newValue: { userId, propertyId, startDate }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.created(res, rental, 'Rental record created successfully');
  } catch (error) {
    next(error);
  }
};

// PUT /api/rentals/:id
export const updateRentalRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rental = await prisma.rentalRecord.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!rental) { ApiResponse.notFound(res, 'Rental record not found'); return; }

    const { status, endDate } = req.body;
    const updated = await prisma.rentalRecord.update({
      where: { id: rental.id },
      data: { ...(status && { status }), ...(endDate && { endDate: new Date(endDate) }) },
    });

    await createAuditLog({
      actorId: req.user!.id, actorRole: 'admin', actorEmail: req.user!.email,
      actionType: 'RENTAL_RECORD_UPDATED', targetTable: 'RentalRecord', targetRecordId: rental.id,
      oldValue: { status: rental.status }, newValue: req.body, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, updated, 'Rental record updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/rentals/:id
export const deleteRentalRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rental = await prisma.rentalRecord.findFirst({ where: { id: req.params.id, adminId: req.user!.id, deletedAt: null } });
    if (!rental) { ApiResponse.notFound(res, 'Rental record not found'); return; }

    await prisma.rentalRecord.update({ where: { id: rental.id }, data: { deletedAt: new Date(), status: 'terminated' } });
    ApiResponse.success(res, null, 'Rental record archived');
  } catch (error) {
    next(error);
  }
};
