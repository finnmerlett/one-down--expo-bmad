import Fastify, { type FastifyServerOptions } from 'fastify';

import { PROJECT_PACKAGE_NAME } from '@one-down/shared';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

export function buildServer(options: FastifyServerOptions = {}) {
  const server = Fastify({
    logger: true,
    ...options,
  });

  server.get('/health', async () => ({
    service: 'one-down-api',
    sharedPackage: PROJECT_PACKAGE_NAME,
    status: 'ok',
  }));

  return server;
}

if (import.meta.main) {
  const server = buildServer();
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;

  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  try {
    await server.listen({ host, port });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}
