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
    // Story 5.2 — JWT verification against Supabase GoTrue. Defaults target
    // the local stack; the production JWKS/jose path is identical (ES256).
    // NOTE deliberately no SUPABASE_JWT_SECRET: signature checks go through
    // the JWKS, never a shared secret (architecture rule).
    SUPABASE_JWKS_URL: z.string().default('http://127.0.0.1:54321/auth/v1/.well-known/jwks.json'),
    SUPABASE_JWT_ISSUER: z.string().default('http://127.0.0.1:54321/auth/v1'),
    // Story 8.3 — ops logging + server-side analytics.
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // Absent → server analytics is a no-op stub (mirror of the mobile seam).
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().default('https://eu.i.posthog.com'),
  })
  .superRefine((env, ctx) => {
    // `debug` is dev/test only — a production deploy shipping debug logs is a
    // misconfiguration (noise + risk of over-logging), fail fast at boot.
    if (env.NODE_ENV === 'production' && env.LOG_LEVEL === 'debug') {
      ctx.addIssue({
        code: 'custom',
        path: ['LOG_LEVEL'],
        message: 'LOG_LEVEL=debug is not allowed when NODE_ENV=production',
      });
    }
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
