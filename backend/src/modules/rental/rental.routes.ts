import { Router } from 'express';
import {
  getAllRentals,
  getRentalDetails,
  createRentalRecord,
  updateRentalRecord,
  deleteRentalRecord
} from './rental.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(generalLimiter);
router.use(authenticate); // Scoped details fetching

router.get('/', getAllRentals);
router.get('/:id', getRentalDetails);

// Admin-only endpoints
router.post('/', requireAdmin, createRentalRecord);
router.put('/:id', requireAdmin, updateRentalRecord);
router.delete('/:id', requireAdmin, deleteRentalRecord);

export default router;
