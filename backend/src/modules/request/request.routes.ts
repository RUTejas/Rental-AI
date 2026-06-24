import { Router } from 'express';
import {
  getAllRequests,
  getRequestDetails,
  createRequest,
  updateRequest,
  deleteRequest
} from './request.controller';
import { authenticate } from '../../middleware/auth';
import { generalLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(generalLimiter);
router.use(authenticate); // Scopes inside controller based on role

router.get('/', getAllRequests);
router.get('/:id', getRequestDetails);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;
