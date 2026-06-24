import { Router } from 'express';
import {
  getAdminDashboard, getMyUsers, createUser, updateUser, deleteUser,
  getMyProperties, createProperty, updateProperty, getMyRequests, updateRequest,
  getAdminNotifications, markAdminNotificationRead,
} from './admin.controller';
import { requireAdmin } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();
router.use(generalLimiter);
router.use(requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getMyUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/properties', getMyProperties);
router.post('/properties', createProperty);
router.put('/properties/:id', updateProperty);
router.get('/requests', getMyRequests);
router.patch('/requests/:id', updateRequest);
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/:id/read', markAdminNotificationRead);

export default router;