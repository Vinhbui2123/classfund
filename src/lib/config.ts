import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  ADMIN_PASSWORD_HASH: z.string().min(1, 'ADMIN_PASSWORD_HASH is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters long'),
  BANK_BIN: z.string().min(1, 'BANK_BIN is required'),
  BANK_ACCOUNT_NUMBER: z.string().min(1, 'BANK_ACCOUNT_NUMBER is required'),
  BANK_ACCOUNT_NAME: z.string().min(1, 'BANK_ACCOUNT_NAME is required'),
});

const getEnv = () => {
  // We check only on server side to prevent public disclosure
  if (typeof window !== 'undefined') {
    return {} as z.infer<typeof configSchema>;
  }

  const result = configSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BANK_BIN: process.env.BANK_BIN,
    BANK_ACCOUNT_NUMBER: process.env.BANK_ACCOUNT_NUMBER,
    BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME,
  });

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables. Please check your .env.local file.');
  }

  return result.data;
};

export const config = getEnv();
export type Config = typeof config;
