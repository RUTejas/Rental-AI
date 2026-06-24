import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthRequest } from '../../middleware/auth';
import { ApiResponse } from '../../utils/ApiResponse';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sendEmail, emailTemplates } from '../../utils/email';
import { verifyCaptcha, generateCaptcha } from '../../utils/captcha';
import { createAuditLog, getClientInfo } from '../../middleware/auditLogger';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';

const isLocked = (lockedUntil: Date | null): boolean =>
  !!lockedUntil && lockedUntil > new Date();

const trackLoginActivity = async (
  userId: string,
  role: 'master_admin' | 'admin' | 'user',
  email: string,
  status: 'success' | 'failed' | 'locked',
  req: AuthRequest,
  failedReason?: string
) => {
  const { ipAddress, deviceInfo } = getClientInfo(req);
  // LoginActivity only links to User table; for master_admin / admin we store directly via prisma
  try {
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorType: role,
        actorEmail: email,
        action: `LOGIN_${status.toUpperCase()}`,
        targetTable: role === 'master_admin' ? 'MasterAdmin' : role === 'admin' ? 'Admin' : 'User',
        ipAddress,
        deviceInfo,
        status,
      },
    });
  } catch (e) {
    logger.error('trackLoginActivity error:', e);
  }
};

// GET /auth/captcha
export const getCaptcha = async (req: AuthRequest, res: Response): Promise<void> => {
  const captcha = generateCaptcha();
  ApiResponse.success(res, captcha, 'Captcha generated');
};

// POST /auth/master/login
export const masterAdminLogin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, captchaToken, captchaAnswer } = req.body;

    if (!verifyCaptcha(captchaToken, parseInt(captchaAnswer))) {
      ApiResponse.badRequest(res, 'Invalid CAPTCHA. Please try again.');
      return;
    }

    const masterAdmin = await prisma.masterAdmin.findUnique({ where: { email: email.toLowerCase() } });
    if (!masterAdmin) {
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    if (isLocked(masterAdmin.lockedUntil)) {
      await trackLoginActivity(masterAdmin.id, 'master_admin', email, 'locked', req, 'Account locked');
      ApiResponse.unauthorized(res, 'Account is temporarily locked. Please try again later.');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, masterAdmin.passwordHash);
    if (!isPasswordValid) {
      const newAttempts = masterAdmin.loginAttempts + 1;
      await prisma.masterAdmin.update({
        where: { id: masterAdmin.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: newAttempts >= config.maxLoginAttempts
            ? new Date(Date.now() + config.lockoutDuration)
            : undefined,
        },
      });
      await trackLoginActivity(masterAdmin.id, 'master_admin', email, 'failed', req, 'Invalid password');
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    await prisma.masterAdmin.update({
      where: { id: masterAdmin.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const payload = { id: masterAdmin.id, email: masterAdmin.email, role: 'master_admin' as const };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await trackLoginActivity(masterAdmin.id, 'master_admin', email, 'success', req);
    await createAuditLog({
      actorId: masterAdmin.id, actorRole: 'master_admin',
      actorEmail: masterAdmin.email, actorName: masterAdmin.name,
      actionType: 'LOGIN', targetTable: 'MasterAdmin', targetRecordId: masterAdmin.id,
      ...getClientInfo(req), status: 'success',
    });

    ApiResponse.success(res, {
      accessToken, refreshToken,
      user: { id: masterAdmin.id, name: masterAdmin.name, email: masterAdmin.email, role: 'master_admin' },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// POST /auth/admin/signup
export const adminSignup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, password, captchaToken, captchaAnswer } = req.body;

    if (!verifyCaptcha(captchaToken, parseInt(captchaAnswer))) {
      ApiResponse.badRequest(res, 'Invalid CAPTCHA. Please try again.');
      return;
    }

    const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      ApiResponse.badRequest(res, 'Email already registered');
      return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const admin = await prisma.admin.create({
      data: {
        name, email: email.toLowerCase(), phone, passwordHash,
        emailVerificationToken, emailVerificationExpiry,
        status: 'PENDING',
      },
    });

    const emailTemplate = emailTemplates.verification(name, emailVerificationToken, config.frontendUrl);
    await sendEmail({ to: email, ...emailTemplate });

    const masterAdmin = await prisma.masterAdmin.findFirst();
    if (masterAdmin) {
      await prisma.notification.create({
        data: {
          recipientId: masterAdmin.id,
          recipientType: 'master_admin',
          title: 'New Admin Signup Request',
          message: `${name} (${email}) has requested admin access. Please review and approve.`,
          type: 'action',
        },
      });
    }

    await createAuditLog({
      actorId: admin.id, actorRole: 'admin', actorEmail: email, actorName: name,
      actionType: 'ADMIN_SIGNUP', targetTable: 'Admin', targetRecordId: admin.id,
      newValue: { name, email, phone }, ...getClientInfo(req), status: 'success',
    });

    ApiResponse.created(res, { id: admin.id, name, email }, 'Registration successful. Please verify your email and wait for Master Admin approval.');
  } catch (error) {
    next(error);
  }
};

// POST /auth/admin/login
export const adminLogin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, captchaToken, captchaAnswer } = req.body;

    if (!verifyCaptcha(captchaToken, parseInt(captchaAnswer))) {
      ApiResponse.badRequest(res, 'Invalid CAPTCHA. Please try again.');
      return;
    }

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || admin.deletedAt) {
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    if (admin.status !== 'APPROVED') {
      ApiResponse.forbidden(res, 'Your account is pending Master Admin approval.');
      return;
    }

    if (isLocked(admin.lockedUntil)) {
      await trackLoginActivity(admin.id, 'admin', email, 'locked', req, 'Account locked');
      ApiResponse.unauthorized(res, 'Account temporarily locked. Try again later.');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      const newAttempts = admin.loginAttempts + 1;
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: newAttempts >= config.maxLoginAttempts
            ? new Date(Date.now() + config.lockoutDuration)
            : undefined,
        },
      });
      await trackLoginActivity(admin.id, 'admin', email, 'failed', req, 'Invalid password');
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const payload = { id: admin.id, email: admin.email, role: 'admin' as const };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await trackLoginActivity(admin.id, 'admin', email, 'success', req);

    ApiResponse.success(res, {
      accessToken, refreshToken,
      user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin', status: admin.status },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// POST /auth/user/signup
export const userSignup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, password, adminId, captchaToken, captchaAnswer } = req.body;

    if (!verifyCaptcha(captchaToken, parseInt(captchaAnswer))) {
      ApiResponse.badRequest(res, 'Invalid CAPTCHA. Please try again.');
      return;
    }

    const adminExists = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!adminExists || adminExists.deletedAt || adminExists.status !== 'APPROVED') {
      ApiResponse.badRequest(res, 'Invalid admin reference');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      ApiResponse.badRequest(res, 'Email already registered');
      return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name, email: email.toLowerCase(), phone, passwordHash, adminId,
        emailVerificationToken, emailVerificationExpiry,
      },
    });

    const emailTemplate = emailTemplates.verification(name, emailVerificationToken, config.frontendUrl);
    await sendEmail({ to: email, ...emailTemplate });

    await prisma.notification.create({
      data: {
        recipientId: adminId,
        recipientType: 'admin',
        adminId,
        title: 'New Tenant Signup',
        message: `${name} (${email}) has registered as a tenant under your account.`,
        type: 'info',
      },
    });

    ApiResponse.created(res, { id: user.id, name, email }, 'Registration successful. Please verify your email.');
  } catch (error) {
    next(error);
  }
};

// POST /auth/user/login
export const userLogin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, captchaToken, captchaAnswer } = req.body;

    if (!verifyCaptcha(captchaToken, parseInt(captchaAnswer))) {
      ApiResponse.badRequest(res, 'Invalid CAPTCHA. Please try again.');
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.deletedAt) {
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    if (user.status === 'suspended') {
      ApiResponse.forbidden(res, 'Your account has been suspended. Contact your admin.');
      return;
    }

    if (isLocked(user.lockedUntil)) {
      await trackLoginActivity(user.id, 'user', email, 'locked', req, 'Account locked');
      ApiResponse.unauthorized(res, 'Account temporarily locked. Try again later.');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const newAttempts = user.loginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: newAttempts >= config.maxLoginAttempts
            ? new Date(Date.now() + config.lockoutDuration)
            : undefined,
        },
      });
      await trackLoginActivity(user.id, 'user', email, 'failed', req, 'Invalid password');
      ApiResponse.unauthorized(res, 'Invalid credentials');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const payload = { id: user.id, email: user.email, role: 'user' as const, adminId: user.adminId };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await trackLoginActivity(user.id, 'user', email, 'success', req);

    ApiResponse.success(res, {
      accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: 'user', adminId: user.adminId },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// POST /auth/refresh
export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      ApiResponse.badRequest(res, 'Refresh token required');
      return;
    }
    const decoded = verifyRefreshToken(token);
    const payload = { id: decoded.id, email: decoded.email, role: decoded.role, adminId: decoded.adminId };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    ApiResponse.success(res, { accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    ApiResponse.unauthorized(res, 'Invalid refresh token');
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, role } = req.body;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
      if (admin && !admin.deletedAt) {
        await prisma.admin.update({
          where: { id: admin.id },
          data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
        });
        const emailTemplate = emailTemplates.passwordReset(admin.name, resetToken, config.frontendUrl);
        await sendEmail({ to: email, ...emailTemplate });
      }
    } else if (role === 'user') {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user && !user.deletedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
        });
        const emailTemplate = emailTemplates.passwordReset(user.name, resetToken, config.frontendUrl);
        await sendEmail({ to: email, ...emailTemplate });
      }
    }

    // Always return success to prevent email enumeration
    ApiResponse.success(res, null, 'If this email exists, a reset link has been sent.');
  } catch (error) {
    next(error);
  }
};

// POST /auth/reset-password
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    if (role === 'admin') {
      const admin = await prisma.admin.findFirst({
        where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() }, deletedAt: null },
      });
      if (!admin) { ApiResponse.badRequest(res, 'Invalid or expired reset token'); return; }
      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null, loginAttempts: 0, lockedUntil: null },
      });
    } else if (role === 'user') {
      const user = await prisma.user.findFirst({
        where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() }, deletedAt: null },
      });
      if (!user) { ApiResponse.badRequest(res, 'Invalid or expired reset token'); return; }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null, loginAttempts: 0, lockedUntil: null },
      });
    } else {
      ApiResponse.badRequest(res, 'Invalid role');
      return;
    }

    ApiResponse.success(res, null, 'Password reset successful. Please login.');
  } catch (error) {
    next(error);
  }
};

// GET /auth/verify-email
export const verifyEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query as { token: string };

    const admin = await prisma.admin.findFirst({
      where: { emailVerificationToken: token, emailVerificationExpiry: { gt: new Date() } },
    });
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
      });
      ApiResponse.success(res, null, 'Email verified successfully. You can now login.');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token, emailVerificationExpiry: { gt: new Date() } },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
      });
      ApiResponse.success(res, null, 'Email verified successfully. You can now login.');
      return;
    }

    ApiResponse.badRequest(res, 'Invalid or expired verification token');
  } catch (error) {
    next(error);
  }
};
