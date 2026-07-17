import { z } from 'zod';

// The well-known supabase-local Postgres (not a secret). postgres.js connects
// lazily, so boot and tests succeed even when the URL is a placeholder.
const LOCAL_SUPABASE_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGIN: z.string().default('*'),
    DATABASE_URL: z.string().default(LOCAL_SUPABASE_DB_URL),
    // Absent → the AI service runs the deterministic fake provider (local/E2E mode).
    GEMINI_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Fail fast at boot when a production deploy forgot to inject DATABASE_URL
    // — otherwise the localhost default boots green and only explodes at the
    // first db-touching procedure with a confusing ECONNREFUSED.
    if (env.NODE_ENV === 'production' && env.DATABASE_URL === LOCAL_SUPABASE_DB_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'DATABASE_URL must be set explicitly when NODE_ENV=production (the localhost default is dev/test only)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

// All process.env reads are confined to this module (architecture rule).
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return envSchema.parse(source);
}

/**
 * NODE_ENV-only probe for module-scope decisions (e.g. tRPC's `isDev`), where
 * the fully validated Env is not available yet. Never throws.
 */
export function isDevEnv(source: Record<string, string | undefined> = process.env): boolean {
  return (source.NODE_ENV ?? 'development') === 'development';
}
