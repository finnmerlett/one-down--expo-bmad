import cors from '@fastify/cors';
import { APP_NAME, type HealthStatus } from '@one-down/shared';
import Fastify from 'fastify';

import { loadEnv, type Env } from './lib/env';

export function buildServer(env: Env) {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: env.CORS_ORIGIN });

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
