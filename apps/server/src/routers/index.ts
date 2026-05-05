import { PROJECT_PACKAGE_NAME } from '@one-down/shared';

import { publicProcedure, router } from '../trpc';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok' as const,
    service: 'one-down-api' as const,
    sharedPackage: PROJECT_PACKAGE_NAME,
    timestamp: new Date().toISOString(),
  })),
});

export type AppRouter = typeof appRouter;
