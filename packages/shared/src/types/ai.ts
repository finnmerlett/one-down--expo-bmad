import type { TaskContext, TaskSize } from './task';

/**
 * One task extracted from a brain dump by the AI service (Story 6.1).
 * This is a DRAFT — nothing is persisted server-side; the mobile client
 * turns drafts into local tasks (computing review flags as it does so).
 */
export interface ParsedTaskDraft {
  title: string;
  details: string | null;
  /** Inferred size — only when clearly implied by the dump text. */
  size: TaskSize | null;
  /** Inferred contexts — empty array when nothing is implied. */
  contexts: TaskContext[];
  /** Inferred deadline as an ISO 8601 string (DTO stays JSON-safe — no superjson yet). */
  deadline: string | null;
  /** Urgency was implied even though no concrete date could be inferred. */
  timeSensitive: boolean;
}

/** Which backend produced a parse — 'fake' is the deterministic no-key local mode. */
export type AiProviderName = 'gemini' | 'fake';

/** Response DTO of the `ai.parseBrainDump` tRPC mutation. */
export interface BrainDumpResult {
  tasks: ParsedTaskDraft[];
  provider: AiProviderName;
}
