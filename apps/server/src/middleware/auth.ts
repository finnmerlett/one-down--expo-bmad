import { createRemoteJWKSet, jwtVerify } from 'jose';

import type { Env } from '../lib/env';

export type JwtVerifier = (token: string) => Promise<{ userId: string } | null>;

/**
 * JWT verification against the Supabase GoTrue JWKS (Story 5.2, NFR-S2).
 * Call once per server build — createRemoteJWKSet caches fetched keys (with
 * its own cooldown/refetch handling), so one instance serves every request.
 * Any failure (bad signature, wrong issuer/audience, expired, malformed)
 * verifies to null — the caller decides how to reject.
 */
export function createJwtVerifier(env: Env): JwtVerifier {
  const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

  return async function verify(token) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: env.SUPABASE_JWT_ISSUER,
        audience: 'authenticated',
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
      return { userId: payload.sub };
    } catch {
      return null;
    }
  };
}
