import type { ServerAnalytics } from './posthog';

// Server-side analytics taxonomy (Story 8.3) — structural data ONLY, never
// procedure inputs or outputs (NFR-S3 by construction):
//   trpc_procedure_completed { procedure, procedure_type, duration_ms }
//   trpc_procedure_failed    { procedure, procedure_type, duration_ms, code }

export interface ProcedureOutcome {
  /** Dot-path of the procedure, e.g. `ai.parseBrainDump`. */
  path: string;
  type: 'query' | 'mutation' | 'subscription';
  durationMs: number;
  ok: boolean;
  /** TRPCError code when ok is false. */
  code?: string;
  /** Authenticated user id (5.2+) or 'anonymous'. */
  distinctId: string;
}

/**
 * Capture one per-procedure analytics event (Story 8.3 AC4). Hand-rolled —
 * the community posthog-trpc package is stale. The tRPC middleware in
 * `src/trpc.ts` times `next()` and delegates here; this function must never
 * receive (and so can never leak) rawInput or results.
 */
export function captureProcedureOutcome(
  analytics: ServerAnalytics,
  { path, type, durationMs, ok, code, distinctId }: ProcedureOutcome,
): void {
  analytics.capture(distinctId, ok ? 'trpc_procedure_completed' : 'trpc_procedure_failed', {
    procedure: path,
    procedure_type: type,
    duration_ms: Math.round(durationMs),
    ...(ok ? {} : { code: code ?? 'UNKNOWN' }),
  });
}
