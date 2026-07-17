import { defineConfig } from 'drizzle-kit';

// Migration generation for the server Postgres schema (source of truth lives
// in @one-down/shared/schema). Generate with `bunx drizzle-kit generate` from
// apps/server. The first generated migration + `drizzle-kit migrate` wiring
// land with the sync layer in Story 5.3.
export default defineConfig({
  dialect: 'postgresql',
  schema: '../../packages/shared/src/schema/index.ts',
  out: './drizzle',
});
