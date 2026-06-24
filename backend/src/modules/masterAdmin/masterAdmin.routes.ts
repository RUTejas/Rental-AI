import { Router } from 'express';
import {
  getDashboardStats, getAllAdmins, approveAdmin, rejectAdmin, suspendAdmin,
  deleteAdmin, restoreAdmin, getAllUsers, getAllProperties, getAuditLogs, getLoginActivity,
  getAnalytics, transferUser, getMasterNotifications, markNotificationRead,
} from './masterAdmin.controller';
import { requireMasterAdmin } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();
router.use(generalLimiter);
router.use(requireMasterAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/admins', getAllAdmins);
router.patch('/admins/:id/approve', approveAdmin);
router.patch('/admins/:id/reject', rejectAdmin);
router.patch('/admins/:id/suspend', suspendAdmin);
router.delete('/admins/:id', deleteAdmin);
router.patch('/admins/:id/restore', restoreAdmin);
router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.post('/users/:userId/transfer', transferUser);
router.get('/audit-logs', getAuditLogs);
router.get('/login-activity', getLoginActivity);
router.get('/analytics', getAnalytics);
router.get('/notifications', getMasterNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
