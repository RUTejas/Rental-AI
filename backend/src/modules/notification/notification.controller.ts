import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import prisma from '../../config/database';

// GET /api/notifications
export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    // Map role string to recipientType if needed
    const recipientType = req.user!.role === 'master_admin' ? 'master_admin' : (req.user!.role === 'admin' ? 'admin' : 'user');

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId, recipientType, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notification.count({ where: { recipientId: userId, recipientType, readStatus: false, deletedAt: null } }),
    ]);

    ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, recipientId: userId, deletedAt: null },
    });

    if (!notification) { ApiResponse.notFound(res, 'Notification not found'); return; }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { readStatus: true },
    });

    ApiResponse.success(res, updated, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const recipientType = req.user!.role === 'master_admin' ? 'master_admin' : (req.user!.role === 'admin' ? 'admin' : 'user');

    await prisma.notification.updateMany({
      where: { recipientId: userId, recipientType, readStatus: false, deletedAt: null },
      data: { readStatus: true },
    });

    ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, recipientId: userId, deletedAt: null },
    });

    if (!notification) { ApiResponse.notFound(res, 'Notification not found'); return; }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { deletedAt: new Date() },
    });

    ApiResponse.success(res, null, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};
