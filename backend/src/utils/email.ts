import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  secure: config.emailPort === 465,
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> => {
  try {
    if (!config.emailUser) {
      logger.warn('Email not configured. Skipping email send.');
      logger.info(`📧 Email would be sent to: ${options.to} | Subject: ${options.subject}`);
      return;
    }
    await transporter.sendMail({
      from: `RentWise AI <${config.emailFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`📧 Email sent to ${options.to}`);
  } catch (error) {
    logger.error('Email send failed:', error);
    // Don't throw - email failure shouldn't break the API
  }
};

export const emailTemplates = {
  verification: (name: string, token: string, frontendUrl: string) => ({
    subject: 'Verify your RentWise AI account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0B1117;color:#FAFAF8;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#C89B5E,#B66A4B);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#0B1117">RentWise AI</h1>
        </div>
        <div style="padding:40px">
          <h2>Welcome, ${name}!</h2>
          <p>Please verify your email address to complete registration.</p>
          <a href="${frontendUrl}/verify-email?token=${token}" style="display:inline-block;background:linear-gradient(135deg,#C89B5E,#B66A4B);color:#0B1117;padding:14px 32px;border-radius:14px;text-decoration:none;font-weight:bold;margin:20px 0">Verify Email</a>
          <p style="color:#9CA3AF;font-size:14px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>
      </div>`,
  }),
  passwordReset: (name: string, token: string, frontendUrl: string) => ({
    subject: 'Reset your RentWise AI password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0B1117;color:#FAFAF8;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#C89B5E,#B66A4B);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#0B1117">RentWise AI</h1>
        </div>
        <div style="padding:40px">
          <h2>Reset Password, ${name}</h2>
          <p>You requested to reset your password. Click below to create a new one.</p>
          <a href="${frontendUrl}/reset-password?token=${token}" style="display:inline-block;background:linear-gradient(135deg,#C89B5E,#B66A4B);color:#0B1117;padding:14px 32px;border-radius:14px;text-decoration:none;font-weight:bold;margin:20px 0">Reset Password</a>
          <p style="color:#9CA3AF;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      </div>`,
  }),
  adminApproved: (name: string, frontendUrl: string) => ({
    subject: 'Your RentWise AI admin account has been approved',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0B1117;color:#FAFAF8;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#C89B5E,#B66A4B);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#0B1117">RentWise AI</h1>
        </div>
        <div style="padding:40px">
          <h2>Congratulations, ${name}!</h2>
          <p>Your admin account has been approved by the Master Administrator. You can now login and manage your properties and tenants.</p>
          <a href="${frontendUrl}/admin/login" style="display:inline-block;background:linear-gradient(135deg,#C89B5E,#B66A4B);color:#0B1117;padding:14px 32px;border-radius:14px;text-decoration:none;font-weight:bold;margin:20px 0">Login Now</a>
        </div>
      </div>`,
  }),
};
