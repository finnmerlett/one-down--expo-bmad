import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

// All process.env reads are confined to this module (architecture rule).
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return envSchema.parse(source);
}
