import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { PROJECT_PACKAGE_NAME } from '@one-down/shared';

import { createDbClient, type Database } from './db/client';
import { loadEnv } from './lib/env';
import { appRouter } from './routers';
import { createContext } from './trpc';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export type BuildServerOptions = FastifyServerOptions & {
  db?: Database;
  corsOrigin?: string;
};

export function buildServer(options: BuildServerOptions = {}) {
  const { db, ...fastifyOptions } = options;
  const server = Fastify({
    logger: true,
    ...fastifyOptions,
  });

  if (db) {
    server.decorate('db', db);
  }

  server.register(cors, {
    origin: options.corsOrigin ?? '*',
  });

  server.get('/health', async () => ({
    service: 'one-down-api',
    sharedPackage: PROJECT_PACKAGE_NAME,
    status: 'ok',
  }));

  server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  return server;
}

if (import.meta.main) {
  const env = loadEnv();
  const { db } = createDbClient(env.DATABASE_URL);
  const server = buildServer({ db, corsOrigin: env.CORS_ORIGIN });

  try {
    await server.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}
