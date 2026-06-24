import { Router } from 'express';
import {
  getAllAgreements,
  getAgreementDetails,
  createAgreement,
  updateAgreement,
  sendAgreementToUser,
  verifyAgreement,
  downloadAgreementPdf
} from './agreement.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(generalLimiter);
router.use(authenticate); // PDF and details check scoping, so authenticate is enough

router.get('/', getAllAgreements);
router.get('/:id', getAgreementDetails);
router.get('/:id/pdf', downloadAgreementPdf);

// Admin-only actions
router.post('/', requireAdmin, createAgreement);
router.put('/:id', requireAdmin, updateAgreement);
router.patch('/:id/send', requireAdmin, sendAgreementToUser);
router.patch('/:id/verify', requireAdmin, verifyAgreement);

export default router;
