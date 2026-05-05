import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { initTRPC, TRPCError } from '@trpc/server';

import { extractBearerToken, verifyJwt } from './middleware/auth';

export type Context = {
  req?: CreateFastifyContextOptions['req'];
  userId?: string;
};

export function createContext({ req }: CreateFastifyContextOptions): Context {
  return { req };
}

const t = initTRPC.context<Context>().create();

const authMiddleware = t.middleware(({ ctx, next }) => {
  const token = extractBearerToken(ctx.req);
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing authorization header' });
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Auth not configured' });
  }

  const payload = verifyJwt(token, jwtSecret);

  return next({
    ctx: { ...ctx, userId: payload.sub },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
