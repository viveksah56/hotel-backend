import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_ACCESS_EXPIRATION: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRATION: z.string(),

  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USERNAME: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM_EMAIL: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  CORS_ORIGIN: z.string(),

  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const env = parsed.data;

const databaseUrl =
  env.DATABASE_URL ??
  `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

export const envConfig = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,

  DATABASE: {
    HOST: env.DB_HOST,
    PORT: env.DB_PORT,
    USER: env.DB_USER,
    PASSWORD: env.DB_PASSWORD,
    NAME: env.DB_NAME,
    URL: databaseUrl,
  },

  JWT: {
    ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    ACCESS_EXPIRATION: env.JWT_ACCESS_EXPIRATION,
    REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    REFRESH_EXPIRATION: env.JWT_REFRESH_EXPIRATION,
  },

  CLOUDINARY: {
    CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    API_KEY: env.CLOUDINARY_API_KEY,
    API_SECRET: env.CLOUDINARY_API_SECRET,
  },

  SMTP: {
    HOST: env.SMTP_HOST,
    PORT: env.SMTP_PORT,
    SECURE: env.SMTP_SECURE,
    USERNAME: env.SMTP_USERNAME,
    PASSWORD: env.SMTP_PASSWORD,
    FROM_EMAIL: env.SMTP_FROM_EMAIL,
  },

  GOOGLE: {
    CLIENT_ID: env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  },

  S3: {
    ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
    REGION: env.S3_REGION,
    BUCKET_NAME: env.S3_BUCKET_NAME,
  },

  CORS_ORIGIN: env.CORS_ORIGIN,
} as const;