import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rentwise_ai',
  jwtSecret: process.env.JWT_SECRET || 'rentwise_super_secret_jwt_key_2024',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'rentwise_refresh_secret_2024',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  masterAdminEmail: process.env.MASTER_ADMIN_EMAIL || 'master@rentwiseai.com',
  masterAdminPassword: process.env.MASTER_ADMIN_PASSWORD || 'MasterAdmin@2024!',
  masterAdminName: process.env.MASTER_ADMIN_NAME || 'Master Administrator',
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@rentwiseai.com',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MS || process.env.LOCKOUT_DURATION || '900000', 10), // 15 min
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  captchaSecret: process.env.CAPTCHA_SECRET || 'rentwise_captcha_secret_2024',
};
