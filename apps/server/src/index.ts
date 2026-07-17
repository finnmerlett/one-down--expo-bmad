import cors from '@fastify/cors';
import { APP_NAME, type HealthStatus } from '@one-down/shared';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createDbClient, type DbClient } from './db/client';
import { loadEnv, type Env } from './lib/env';
import { appRouter, type AppRouter } from './routers';
import { createContextFactory } from './trpc';

// 5.1 imports this TYPE-ONLY (`import type { AppRouter } from '@one-down/server'`)
// — a value import would drag Fastify/drizzle/postgres.js into the Metro bundle.
export type { AppRouter } from './routers';

export interface BuildServerOptions {
  /** Inject a Drizzle client (tests); defaults to one built from env.DATABASE_URL. */
  db?: DbClient;
}

export function buildServer(env: Env, options: BuildServerOptions = {}) {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  // Lazy client — no connection is opened until the first query runs.
  const db = options.db ?? createDbClient(env.DATABASE_URL);
  if (!options.db) {
    // Self-created pool: tie its lifecycle to the app so `app.close()` drains
    // it (injected clients stay owned — and closed — by their caller).
    app.addHook('onClose', async () => {
      await db.$client.end();
    });
  }

  app.register(cors, { origin: env.CORS_ORIGIN });

  app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: createContextFactory({ env, db }),
      onError({ path, error }) {
        app.log.error({ path, err: error }, 'tRPC error');
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  // Liveness check — tRPC `health` query is the end-to-end counterpart.
  app.get(
    '/health',
    (): HealthStatus => ({
      status: 'ok',
      service: `${APP_NAME}-api`,
      timestamp: new Date().toISOString(),
    }),
  );

  return app;
}

if (import.meta.main) {
  const env = loadEnv();
  const app = buildServer(env);

  app.listen({ port: env.PORT, host: env.HOST }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
