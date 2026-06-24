import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const seedMasterAdmin = async (): Promise<void> => {
  try {
    const email = config.masterAdminEmail.toLowerCase();
    const existing = await prisma.masterAdmin.findUnique({ where: { email } });

    if (existing) {
      logger.info(`Master Admin with email ${email} already exists. Skipping seed.`);
    } else {
      const passwordHash = await bcrypt.hash(config.masterAdminPassword, config.bcryptRounds);
      await prisma.masterAdmin.create({
        data: {
          name: config.masterAdminName,
          email,
          passwordHash,
        }
      });
      logger.info(`✅ Master Admin seeded successfully!`);
      logger.info(`Email: ${email}`);
    }
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Run the script directly if executed via cli
if (require.main === module) {
  seedMasterAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
