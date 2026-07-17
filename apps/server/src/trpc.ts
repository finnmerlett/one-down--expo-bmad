import { initTRPC } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import type { DbClient } from './db/client';
import { captureProcedureOutcome } from './lib/analytics-middleware';
import { isDevEnv, type Env } from './lib/env';
import type { ServerAnalytics } from './lib/posthog';

/** Server-scoped dependencies baked into every request context. */
export interface ContextSeed {
  env: Env;
  db: DbClient;
  analytics: ServerAnalytics;
}

export interface Context extends ContextSeed {
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
  /** Authenticated user — arrives with Story 5.2's auth middleware. */
  user?: { id: string };
}

/** Build the per-request context factory the Fastify adapter calls. */
export function createContextFactory(seed: ContextSeed) {
  return function createContext({ req, res }: CreateFastifyContextOptions): Context {
    return { ...seed, req, res };
  };
}

// No transformer yet — superjson is deferred until the first Date-carrying
// procedure (Story 5.3) and must be wired client + server simultaneously.
// `isDev` is passed explicitly: tRPC's default reads process.env.NODE_ENV
// directly (bypassing the env seam) and treats "unset" as dev, which would
// leak server stack traces in client error payloads on any deploy that
// forgets to set NODE_ENV=production.
const t = initTRPC.context<Context>().create({ isDev: isDevEnv() });

// Per-procedure analytics (Story 8.3 AC4): times next() and captures the
// structural outcome — path, type, duration, ok/error code. It never reads
// rawInput or the result payload (NFR-S3 by construction); without a
// POSTHOG_API_KEY ctx.analytics is a no-op stub, so the only overhead is the
// timer. Attached to the BASE procedure so every current and future procedure
// inherits it.
const analyticsMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const startedAt = performance.now();
  const result = await next();
  captureProcedureOutcome(ctx.analytics, {
    path,
    type,
    durationMs: performance.now() - startedAt,
    ok: result.ok,
    code: result.ok ? undefined : result.error.code,
    distinctId: ctx.user?.id ?? 'anonymous',
  });
  return result;
});

export const router = t.router;
// Auth middleware / protectedProcedure arrive in Story 5.2 — publicProcedure only here.
export const publicProcedure = t.procedure.use(analyticsMiddleware);
