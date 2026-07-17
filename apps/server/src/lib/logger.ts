import { stdTimeFunctions, type LoggerOptions } from 'pino';

import type { Env } from './env';

// Structured, queryable ops logging (Story 8.3, NFR-L1 — logging-best-practices
// skill): JSON key-value only, ISO timestamps, level-as-label, base fields
// identifying the emitter, and trimmed serializers. Request/response BODIES
// are never serialized — tRPC payloads can carry task text (NFR-S3).
// App code logs via req.log / app.log with snake_case past-tense `event`
// fields; never console.*.

export function buildLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    base: { service: 'one-down-api', environment: env.NODE_ENV },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      // `"level":"info"` instead of pino's numeric levels — queryable without
      // a lookup table.
      level: (label) => ({ level: label }),
    },
    // Belt-and-braces: the req serializer below never includes headers, but a
    // future serializer change must not start leaking bearer tokens.
    redact: ['req.headers.authorization'],
    serializers: {
      req: (req: { method?: string; url?: string }) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    // Dev-only pretty printing; production stays newline-delimited JSON.
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  };
}
