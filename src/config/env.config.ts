import dotenv from 'dotenv';

dotenv.config();

const databaseUrl =
    process.env.DATABASE_URL ??
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const envConfig = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),

  DATABASE: {
    HOST: process.env.DB_HOST ?? 'localhost',
    PORT: Number(process.env.DB_PORT ?? 5432),
    USER: process.env.DB_USER ?? '',
    PASSWORD: process.env.DB_PASSWORD ?? '',
    NAME: process.env.DB_NAME ?? '',
    URL: databaseUrl,
  },

  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? '',
    ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? '',
    REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },

  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  SMTP: {
    HOST: process.env.SMTP_HOST ?? '',
    PORT: Number(process.env.SMTP_PORT ?? 587),
    SECURE: process.env.SMTP_SECURE === 'true',
    USERNAME: process.env.SMTP_USERNAME ?? '',
    PASSWORD: process.env.SMTP_PASSWORD ?? '',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL ?? '',
  },

  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },

  S3: {
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    REGION: process.env.S3_REGION,
    BUCKET_NAME: process.env.S3_BUCKET_NAME,
  },
  API_BASE_URL: process.env.API_BASE_URL ?? `http://localhost:${Number(process.env.PORT ?? 5000)}`,

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
} as const;