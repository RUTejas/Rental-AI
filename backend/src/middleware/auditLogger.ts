import { AuthRequest } from './auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export const createAuditLog = async (options: {
  actorId: string;
  actorRole: 'master_admin' | 'admin' | 'user' | 'system';
  actorEmail: string;
  actorName?: string;
  actionType: string;
  targetTable: string;
  targetRecordId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  deviceInfo?: string;
  status?: 'success' | 'failed';
  remarks?: string;
}): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: options.actorId,
        actorType: options.actorRole,
        actorEmail: options.actorEmail,
        actorName: options.actorName,
        action: options.actionType,
        targetTable: options.targetTable,
        targetId: options.targetRecordId,
        oldValue: options.oldValue as any,
        newValue: options.newValue as any,
        ipAddress: options.ipAddress,
        deviceInfo: options.deviceInfo,
        status: options.status || 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

export const getClientInfo = (req: AuthRequest) => ({
  ipAddress:
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown',
  deviceInfo: req.headers['user-agent'] || 'unknown',
});
