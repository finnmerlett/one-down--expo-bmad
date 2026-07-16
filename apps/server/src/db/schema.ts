// Single import point for the server's Drizzle tables — the definitions live
// in the shared package (`@one-down/shared/schema`, pgTable side) so client
// and server stay conformant to the same canonical TaskData shape.
export * from '@one-down/shared/schema';
