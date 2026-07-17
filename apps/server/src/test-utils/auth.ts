import { randomUUID } from 'node:crypto';

// Integration-test auth helper (Story 5.2): mints REAL users + JWTs against
// the local Supabase stack's GoTrue — no mocked verification anywhere.
// PREREQ: the stack is running (`supabase start`, API on :54321).
export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

// Publicly-known supabase-local demo anon key (a constant of the local stack,
// not a secret).
const LOCAL_DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export interface TestUser {
  userId: string;
  accessToken: string;
  email: string;
}

/**
 * Signs up a fresh GoTrue user (unique email per call). Local config has
 * confirmations disabled, so the response carries a live session immediately.
 */
export async function createTestUser(): Promise<TestUser> {
  const email = `e2e-${randomUUID()}@test.local`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: LOCAL_DEMO_ANON_KEY },
    body: JSON.stringify({ email, password: 'test-password-123' }),
  });
  if (!response.ok) {
    throw new Error(
      `GoTrue signup failed (is the local supabase stack running?): ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as {
    access_token: string;
    user: { id: string };
  };
  return { userId: body.user.id, accessToken: body.access_token, email };
}
