import { initTRPC } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import type { DbClient } from './db/client';
import { isDevEnv, type Env } from './lib/env';

/** Server-scoped dependencies baked into every request context. */
export interface ContextSeed {
  env: Env;
  db: DbClient;
}

export interface Context extends ContextSeed {
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
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

export const router = t.router;
// Auth middleware / protectedProcedure arrive in Story 5.2 — publicProcedure only here.
export const publicProcedure = t.procedure;
