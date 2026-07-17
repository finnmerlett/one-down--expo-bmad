import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'bun:test';
import { generateKeyPair, SignJWT } from 'jose';

import { buildServer } from '../index';
import { loadEnv } from '../lib/env';
import { createTestUser } from '../test-utils/auth';

// Integration tests against the REAL local GoTrue (per CLAUDE.md: real JWTs,
// no mocked verification). whoAmI never touches the db, so the placeholder
// DATABASE_URL keeps postgres out of the picture.
const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://placeholder:placeholder@placeholder.invalid:5432/placeholder',
});
const app = buildServer(env);

afterAll(async () => {
  await app.close();
});

function whoAmI(headers: Record<string, string> = {}) {
  return app.inject({ method: 'GET', url: '/trpc/whoAmI', headers });
}

describe('protectedProcedure auth middleware (whoAmI)', () => {
  it('accepts a real GoTrue token and echoes its user id', async () => {
    const user = await createTestUser();

    const response = await whoAmI({ authorization: `Bearer ${user.accessToken}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().result.data).toEqual({ userId: user.userId });
  });

  it('rejects a missing Authorization header with UNAUTHORIZED', async () => {
    const response = await whoAmI();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.data.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token (signature actually checked)', async () => {
    const user = await createTestUser();
    const [header, payload, signature] = user.accessToken.split('.') as [string, string, string];
    // Flip a payload character — any signature check must now fail.
    const tampered = `${header}.${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}.${signature}`;

    const response = await whoAmI({ authorization: `Bearer ${tampered}` });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.data.code).toBe('UNAUTHORIZED');
  });

  it('rejects a self-signed ES256 token with correct claims (JWKS, not decode)', async () => {
    // Right algorithm, right issuer/audience/expiry — but a key GoTrue never
    // published. Proves verification goes through the JWKS, not just decoding.
    const { privateKey } = await generateKeyPair('ES256');
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'not-a-real-kid' })
      .setIssuer(env.SUPABASE_JWT_ISSUER)
      .setAudience('authenticated')
      .setSubject(randomUUID())
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const response = await whoAmI({ authorization: `Bearer ${forged}` });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.data.code).toBe('UNAUTHORIZED');
  });

  it('leaves the public health procedure open', async () => {
    const response = await app.inject({ method: 'GET', url: '/trpc/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json().result.data.status).toBe('ok');
  });
});
