import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? resolve(process.cwd(), '.env') : resolve(process.cwd(), '../.env') });

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXP_SECONDS: z.coerce.number().int().positive().default(28_800),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export const env = schema.parse(process.env);
