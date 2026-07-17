import { randomUUID } from 'node:crypto';

import cors from '@fastify/cors';
import { APP_NAME, type HealthStatus } from '@one-down/shared';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createDbClient, type DbClient } from './db/client';
import { loadEnv, type Env } from './lib/env';
import { buildLoggerOptions } from './lib/logger';
import { createServerPostHog, type ServerAnalytics } from './lib/posthog';
import { appRouter, type AppRouter } from './routers';
import { createContextFactory } from './trpc';

// 5.1 imports this TYPE-ONLY (`import type { AppRouter } from '@one-down/server'`)
// — a value import would drag Fastify/drizzle/postgres.js into the Metro bundle.
export type { AppRouter } from './routers';

export interface BuildServerOptions {
  /** Inject a Drizzle client (tests); defaults to one built from env.DATABASE_URL. */
  db?: DbClient;
  /** Inject an analytics client (tests); defaults to one built from env (Story 8.3). */
  analytics?: ServerAnalytics;
}

export function buildServer(env: Env, options: BuildServerOptions = {}) {
  const app = Fastify({
    // Structured pino logging (Story 8.3, NFR-L1); silent under test.
    logger: env.NODE_ENV === 'test' ? false : buildLoggerOptions(env),
    // Correlation id on every request log: honour the inbound x-request-id
    // (context propagation across boundaries) else mint one.
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      const inbound = Array.isArray(header) ? header[0] : header;
      return inbound && inbound.length > 0 ? inbound : randomUUID();
    },
  });

  // Lazy client — no connection is opened until the first query runs.
  const db = options.db ?? createDbClient(env.DATABASE_URL);
  if (!options.db) {
    // Self-created pool: tie its lifecycle to the app so `app.close()` drains
    // it (injected clients stay owned — and closed — by their caller).
    app.addHook('onClose', async () => {
      await db.$client.end();
    });
  }

  // No-op stub without POSTHOG_API_KEY; flushed on close either way.
  const analytics = options.analytics ?? createServerPostHog(env);
  app.addHook('onClose', async () => {
    await analytics.shutdown();
  });

  app.register(cors, { origin: env.CORS_ORIGIN });

  app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: createContextFactory({ env, db, analytics }),
      onError({ path, error }) {
        app.log.error({ event: 'trpc_procedure_errored', path, err: error }, 'tRPC error');
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

  app
    .listen({ port: env.PORT, host: env.HOST })
    .then(() => {
      app.log.info({ event: 'server_started', port: env.PORT }, 'server started');
    })
    .catch((error: unknown) => {
      app.log.error({ event: 'server_start_failed', err: error }, 'server failed to start');
      process.exit(1);
    });
}
