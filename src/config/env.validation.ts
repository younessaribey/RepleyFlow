import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string(),
  DATABASE_URL: z.string().url(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_ACCESS_TOKEN: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  REDIS_URL: z.string().url(),
  DELIVERY_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (rawConfig: NodeJS.ProcessEnv): EnvConfig => {
  const result = envSchema.safeParse(rawConfig);

  if (!result.success) {
    throw new Error(`Environment validation error: ${result.error.message}`);
  }

  return result.data;
};
