import { Router } from 'express';
import {
  getAllDocuments,
  getDocumentDetails,
  verifyDocument,
  serveDocumentFile
} from './document.controller';
import { authenticate, requireAdminOrMaster } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(generalLimiter);
router.use(authenticate); // File streaming needs at least login

// Secure file serving endpoint
router.get('/file/:filename', serveDocumentFile);

// Admin / Master Admin endpoints
router.get('/', requireAdminOrMaster, getAllDocuments);
router.get('/:id', getDocumentDetails); // Users can get details of own, code handles scoping
router.patch('/:id/verify', requireAdminOrMaster, verifyDocument);

export default router;
