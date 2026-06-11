import { defineConfig } from 'drizzle-kit';

// Build-time only: `bunx drizzle-kit generate` (from apps/mobile) regenerates
// ./drizzle from the shared schema. The generated SQL + migrations.js are
// committed and bundled; the app applies them on start via useMigrations().
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: '../../packages/shared/src/schema-local/index.ts',
  out: './drizzle',
});
