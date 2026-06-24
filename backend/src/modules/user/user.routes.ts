import { Router } from 'express';
import {
  getUserDashboard,
  getUserProfile,
  updateUserProfile,
  getUserProperty,
  getUserAgreement,
  acceptUserAgreement,
  getUserDocuments,
  uploadUserDocument,
  deleteUserDocument,
  getUserRequests,
  createUserRequest,
  getUserNotifications,
  markUserNotificationRead
} from './user.controller';
import { requireUser } from '../../middleware/auth';
import { generalLimiter, uploadLimiter } from '../../middleware/rateLimiter';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(generalLimiter);
router.use(requireUser);

router.get('/dashboard', getUserDashboard);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/property', getUserProperty);

router.get('/agreement', getUserAgreement);
router.post('/agreement/:id/accept', acceptUserAgreement);

router.get('/documents', getUserDocuments);
router.post('/documents', uploadLimiter, upload.single('document'), uploadUserDocument);
router.delete('/documents/:id', deleteUserDocument);

router.get('/requests', getUserRequests);
router.post('/requests', createUserRequest);

router.get('/notifications', getUserNotifications);
router.patch('/notifications/:id/read', markUserNotificationRead);

export default router;
