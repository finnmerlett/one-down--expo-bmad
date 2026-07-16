import { APP_NAME, SHARED_PACKAGE_NAME } from '@one-down/shared';

import { publicProcedure, router } from '../trpc';

// Root router — the single entry point. Feature routers (sync, ai,
// notification, subscription) are registered here as their epics land.
export const appRouter = router({
  // End-to-end probe through the tRPC + Fastify adapter stack. The
  // Fastify-native GET /health stays the pure liveness check; this one proves
  // routing, context creation, and the shared-package import all work.
  health: publicProcedure.query(() => ({
    status: 'ok' as const,
    service: `${APP_NAME}-api`,
    sharedPackage: SHARED_PACKAGE_NAME,
    timestamp: new Date().toISOString(),
  })),
});

export type AppRouter = typeof appRouter;
