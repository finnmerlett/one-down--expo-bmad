import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import type { DbClient } from './db/client';
import { captureProcedureOutcome } from './lib/analytics-middleware';
import { isDevEnv, type Env } from './lib/env';
import type { ServerAnalytics } from './lib/posthog';
import type { JwtVerifier } from './middleware/auth';

/** Server-scoped dependencies baked into every request context. */
export interface ContextSeed {
  env: Env;
  db: DbClient;
  analytics: ServerAnalytics;
  verifyJwt: JwtVerifier;
}

export interface Context extends ContextSeed {
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
  /** Authenticated user — set by the auth middleware (Story 5.2). */
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

// Story 5.2: parse `Authorization: Bearer <jwt>` and verify against the
// GoTrue JWKS. Runs INSIDE the analytics middleware — mutating `ctx.user`
// (same object the outer middleware holds) is what lets analytics report a
// real distinctId for protected procedures. Downstream ctx narrows to carry
// a guaranteed `userId`.
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const header = ctx.req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing bearer token' });
  }
  const verified = await ctx.verifyJwt(token);
  if (!verified) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
  ctx.user = { id: verified.userId };
  return next({ ctx: { userId: verified.userId } });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(analyticsMiddleware);
export const protectedProcedure = publicProcedure.use(authMiddleware);
