import { describe, expect, it } from 'bun:test';

import { loadEnv } from './env';
import { buildLoggerOptions } from './logger';

describe('buildLoggerOptions', () => {
  it('merges level, base identity fields, and the authorization redact path', () => {
    const options = buildLoggerOptions(loadEnv({ NODE_ENV: 'development', LOG_LEVEL: 'warn' }));

    expect(options.level).toBe('warn');
    expect(options.base).toEqual({ service: 'one-down-api', environment: 'development' });
    expect(options.redact).toEqual(['req.headers.authorization']);
  });

  it('stamps ISO-8601 timestamps and level labels (queryable, not numeric)', () => {
    const options = buildLoggerOptions(loadEnv({ NODE_ENV: 'development' }));

    // pino timestamp functions return a `,"time":...` JSON fragment.
    const fragment = (options.timestamp as () => string)();
    expect(fragment).toMatch(/^,"time":"\d{4}-\d{2}-\d{2}T[\d:.]+Z"$/);
    expect(options.formatters?.level?.('info', 30)).toEqual({ level: 'info' });
  });

  it('trims req/res serializers to structure only — never bodies (NFR-S3)', () => {
    const options = buildLoggerOptions(
      loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://a:b@db.internal:5432/x' }),
    );

    const req = options.serializers?.req?.({
      method: 'POST',
      url: '/trpc/ai.parseBrainDump',
      body: 'SENSITIVE task text',
      headers: { authorization: 'Bearer SENSITIVE' },
    });
    expect(req).toEqual({ method: 'POST', url: '/trpc/ai.parseBrainDump' });
    expect(JSON.stringify(req)).not.toContain('SENSITIVE');

    expect(options.serializers?.res?.({ statusCode: 200 })).toEqual({ statusCode: 200 });
  });

  it('enables pretty printing in development only', () => {
    expect(buildLoggerOptions(loadEnv({ NODE_ENV: 'development' })).transport).toBeDefined();
    expect(
      buildLoggerOptions(
        loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://a:b@db.internal:5432/x' }),
      ).transport,
    ).toBeUndefined();
  });
});
