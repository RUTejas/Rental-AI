import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import prisma from './config/database';
import bcrypt from 'bcryptjs';

// Route Imports
import authRoutes from './modules/auth/auth.routes';
import masterRoutes from './modules/masterAdmin/masterAdmin.routes';
import adminRoutes from './modules/admin/admin.routes';
import userRoutes from './modules/user/user.routes';
import agreementRoutes from './modules/agreement/agreement.routes';
import documentRoutes from './modules/document/document.routes';
import rentalRoutes from './modules/rental/rental.routes';
import requestRoutes from './modules/request/request.routes';
import notificationRoutes from './modules/notification/notification.routes';

const app = express();

// Establish Database Connection
connectDatabase();

// Bootstrap Master Admin check for first deployment
const bootstrapMasterAdmin = async () => {
  try {
    const email = config.masterAdminEmail.toLowerCase();
    const existing = await prisma.masterAdmin.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(config.masterAdminPassword, config.bcryptRounds);
      await prisma.masterAdmin.create({
        data: {
          name: config.masterAdminName,
          email,
          passwordHash
        }
      });
      logger.info(`✨ First deployment bootstrap: Master Admin (${email}) created.`);
    }
  } catch (error) {
    logger.error('Failed to bootstrap Master Admin:', error);
  }
};
bootstrapMasterAdmin();

// Set Up Upload Directory
const uploadDir = path.join(__dirname, '../', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const docsDir = path.join(uploadDir, 'documents');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Middlewares
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP Request logging
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('💥 Unhandled Rejection! Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

export default app;
