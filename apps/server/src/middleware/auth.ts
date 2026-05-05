import { createHmac, timingSafeEqual } from 'node:crypto';

import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc';

export type JwtPayload = {
  sub: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Malformed token' });
  }

  const headerB64 = parts[0]!;
  const payloadB64 = parts[1]!;
  const signatureB64 = parts[2]!;

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
  if (header.alg !== 'HS256') {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unsupported algorithm' });
  }

  const expectedSig = base64UrlEncode(
    createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest(),
  );

  if (
    expectedSig.length !== signatureB64.length ||
    !timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signatureB64))
  ) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid signature' });
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8'));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token expired' });
  }

  if (!payload.sub) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing subject' });
  }

  return payload;
}

export function extractBearerToken(req: Context['req']): string | null {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}
