import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load `.env` from the repo root first, then the server folder (server overrides nothing already set).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ',
    path: ['JWT_REFRESH_SECRET'],
  });

export interface Config {
  env: 'development' | 'test' | 'production';
  isProd: boolean;
  port: number;
  clientOrigins: string[];
  mongoUri: string;
  accessSecret: string;
  refreshSecret: string;
  trustProxy: number;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

let cached: Config | null = null;

/** Parses and validates environment variables once. Throws a readable error (never prints secret values). */
export function getConfig(): Config {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example`);
  }
  const e = parsed.data;
  cached = {
    env: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    port: e.PORT,
    clientOrigins: e.CLIENT_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')),
    mongoUri: e.MONGODB_URI,
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    trustProxy: e.TRUST_PROXY,
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 7 * 24 * 60 * 60,
  };
  return cached;
}

