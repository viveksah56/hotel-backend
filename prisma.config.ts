import { config } from 'dotenv';
import path from 'path';
import { defineConfig, env } from 'prisma/config';

config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});