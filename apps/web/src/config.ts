import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_REGISTER_WINDOW_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  AUTH_REGISTER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  AUTH_REFRESH_WINDOW_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  AUTH_REFRESH_MAX_ATTEMPTS: z.coerce.number().int().positive().default(12),

  DATA_ROOT: z.string().default('./'),

  DB_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: z.string().optional(),
  DB_SSL: z.enum(['disable', 'require']).default('disable'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),

  ALLOW_REGISTRATION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  const env = parsed.data;

  const rootDir = path.resolve(env.DATA_ROOT);

  if (env.DB_DRIVER === 'postgres' && !env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required when DB_DRIVER=postgres');
  }

  return {
    port: env.PORT,
    host: env.HOST,

    jwt: {
      secret: env.JWT_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    authRateLimit: {
      login: {
        windowMs: env.AUTH_LOGIN_WINDOW_MS,
        maxAttempts: env.AUTH_LOGIN_MAX_ATTEMPTS,
      },
      register: {
        windowMs: env.AUTH_REGISTER_WINDOW_MS,
        maxAttempts: env.AUTH_REGISTER_MAX_ATTEMPTS,
      },
      refresh: {
        windowMs: env.AUTH_REFRESH_WINDOW_MS,
        maxAttempts: env.AUTH_REFRESH_MAX_ATTEMPTS,
      },
    },

    rootDir,
    dataDir: path.join(rootDir, 'data'),

    database: {
      driver: env.DB_DRIVER,
      sqlitePath: path.join(rootDir, 'data', 'prompthub.db'),
      postgresUrl: env.DATABASE_URL?.trim(),
      ssl: env.DB_SSL === 'require' ? 'require' : false,
      pool: {
        max: env.DB_POOL_MAX,
        idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
      },
    },

    allowRegistration: env.ALLOW_REGISTRATION,
    logLevel: env.LOG_LEVEL,
  };
}

export interface Config {
  port: number;
  host: string;

  jwt: {
    secret: string;
    accessTtl: number;
    refreshTtl: number;
  };

  authRateLimit: {
    login: {
      windowMs: number;
      maxAttempts: number;
    };
    register: {
      windowMs: number;
      maxAttempts: number;
    };
    refresh: {
      windowMs: number;
      maxAttempts: number;
    };
  };

  rootDir: string;
  dataDir: string;

  database: {
    driver: 'sqlite' | 'postgres';
    sqlitePath: string;
    postgresUrl?: string;
    ssl: false | 'require';
    pool: {
      max: number;
      idleTimeoutMillis: number;
      connectionTimeoutMillis: number;
    };
  };

  allowRegistration: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const config = loadConfig();
