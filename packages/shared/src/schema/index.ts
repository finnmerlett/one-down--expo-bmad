// Placeholder for Drizzle table definitions (source of truth for both client and server).
//
// Story 1.2 introduces the canonical `TaskData` type and the first real tables:
//   - `./index.ts` (this file): pgTable definitions for the server (`@one-down/shared/schema`)
//   - `../schema-local`: sqliteTable definitions for mobile (`@one-down/shared/schema-local`)
// The two must conform to the same canonical shape. The mobile bundle must never
// import `drizzle-orm/pg-core`, so the package barrel re-exports neither entry point.
export {};
