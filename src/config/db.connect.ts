import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { envConfig } from './env.config.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: envConfig.DATABASE.URL });

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: envConfig.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (envConfig.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
};