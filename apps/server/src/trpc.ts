import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { initTRPC } from '@trpc/server';

export type Context = {
  req?: CreateFastifyContextOptions['req'];
};

export function createContext({ req }: CreateFastifyContextOptions): Context {
  return { req };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
