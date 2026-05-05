import { createHmac } from 'node:crypto';

import { describe, expect, test } from 'bun:test';

import { extractBearerToken, verifyJwt } from './auth';

const TEST_SECRET = 'test-secret-key-for-jwt-signing';

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createTestJwt(
  payload: Record<string, unknown>,
  secret: string = TEST_SECRET,
  alg = 'HS256',
): string {
  const header = base64UrlEncode(JSON.stringify({ alg, typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    createHmac('sha256', secret).update(`${header}.${body}`).digest(),
  );
  return `${header}.${body}.${signature}`;
}

describe('verifyJwt', () => {
  test('verifies a valid HS256 token', () => {
    const token = createTestJwt({
      sub: 'user-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const payload = verifyJwt(token, TEST_SECRET);
    expect(payload.sub).toBe('user-123');
  });

  test('rejects a token with invalid signature', () => {
    const token = createTestJwt({ sub: 'user-123' }, 'wrong-secret');

    expect(() => verifyJwt(token, TEST_SECRET)).toThrow('Invalid signature');
  });

  test('rejects an expired token', () => {
    const token = createTestJwt({
      sub: 'user-123',
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    expect(() => verifyJwt(token, TEST_SECRET)).toThrow('Token expired');
  });

  test('rejects a malformed token (wrong number of parts)', () => {
    expect(() => verifyJwt('not.a.valid.token.at.all', TEST_SECRET)).toThrow('Malformed token');
    expect(() => verifyJwt('onlyonepart', TEST_SECRET)).toThrow('Malformed token');
  });

  test('rejects a token without sub claim', () => {
    const token = createTestJwt({ aud: 'test' });

    expect(() => verifyJwt(token, TEST_SECRET)).toThrow('Missing subject');
  });

  test('accepts a token with no exp (non-expiring)', () => {
    const token = createTestJwt({ sub: 'user-456' });

    const payload = verifyJwt(token, TEST_SECRET);
    expect(payload.sub).toBe('user-456');
  });
});

describe('extractBearerToken', () => {
  test('extracts token from valid Authorization header', () => {
    const req = { headers: { authorization: 'Bearer my-jwt-token' } };
    expect(extractBearerToken(req as never)).toBe('my-jwt-token');
  });

  test('returns null when no Authorization header', () => {
    const req = { headers: {} };
    expect(extractBearerToken(req as never)).toBeNull();
  });

  test('returns null when Authorization is not Bearer scheme', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    expect(extractBearerToken(req as never)).toBeNull();
  });

  test('returns null when req is undefined', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
