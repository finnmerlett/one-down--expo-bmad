import { defineConfig } from 'drizzle-kit';

// Migration generation for the server Postgres schema (source of truth lives
// in @one-down/shared/schema). From apps/server:
//   bunx drizzle-kit generate   — emit a new migration after schema changes
//   bunx drizzle-kit migrate    — apply migrations (bun run db:migrate)
// DATABASE_URL defaults to the local supabase stack's Postgres (well-known
// local dev credentials, not a secret) — matches src/lib/env.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: '../../packages/shared/src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
});
