import { Router } from 'express';
import {
  getCaptcha,
  masterAdminLogin,
  adminSignup,
  adminLogin,
  userSignup,
  userLogin,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from './auth.controller';
import { authLimiter } from '../../middleware/rateLimiter';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';

const router = Router();

router.get('/captcha', getCaptcha);

router.post('/master/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('captchaToken').notEmpty(),
  body('captchaAnswer').notEmpty().isNumeric(),
], validate([body('email').isEmail(), body('password').notEmpty()]), masterAdminLogin);

router.post('/admin/signup', authLimiter, adminSignup);
router.post('/admin/login', authLimiter, adminLogin);
router.post('/user/signup', authLimiter, userSignup);
router.post('/user/login', authLimiter, userLogin);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/verify-email', verifyEmail);

export default router;
