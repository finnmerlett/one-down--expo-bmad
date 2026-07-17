import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  GEMINI_MODEL,
  MAX_BREAKDOWN_STEP_CHARS,
  MAX_BREAKDOWN_STEPS,
  MAX_NOTES_DISTILLATION_CHARS,
  MAX_PARSED_TASKS,
  TASK_CONTEXTS,
  TASK_SIZES,
  type BreakdownMode,
  type ParsedTaskDraft,
  type TaskContext,
  type TaskSize,
} from '@one-down/shared';
import { z } from 'zod';

import { truncateChars } from '../../lib/text';
import type {
  AiProvider,
  BreakdownTaskInput,
  RefineBreakdownInput,
  RefineBreakdownOutput,
  TaskPromptContext,
} from './provider';

// Real Gemini provider — selected only when GEMINI_API_KEY is configured.
// NFR-S3: nothing in this module may log or embed the user's dump text or
// parsed titles in errors — failures carry generic messages only.

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Short imperative task title extracted from the text.',
      },
      details: {
        type: Type.STRING,
        nullable: true,
        description: 'Extra detail from the text that belongs to this task, if any.',
      },
      size: {
        type: Type.STRING,
        format: 'enum',
        enum: [...TASK_SIZES],
        nullable: true,
        description: 'Task size — ONLY when clearly implied, otherwise null.',
      },
      contexts: {
        type: Type.ARRAY,
        items: { type: Type.STRING, format: 'enum', enum: [...TASK_CONTEXTS] },
        description: 'Contexts required to do the task — ONLY when clearly implied.',
      },
      deadline: {
        type: Type.STRING,
        nullable: true,
        description: 'ISO 8601 date-time deadline — ONLY when a date is clearly implied.',
      },
      timeSensitive: {
        type: Type.BOOLEAN,
        description: 'True when urgency is implied but no concrete date is given.',
      },
    },
    required: ['title'],
  },
};

function buildSystemInstruction(): string {
  return [
    'You extract individual actionable tasks from a free-form "brain dump" written by a person with ADHD.',
    'Rules:',
    '- Split the text into DISTINCT tasks; merge duplicate mentions of the same task.',
    '- Keep titles short and action-oriented; put remaining relevant text in details.',
    '- Infer size, contexts, or deadline ONLY when you are confident the text clearly implies them; otherwise use null (or an empty contexts array). When unsure, leave the field null.',
    '- size: "quick_win" = a few minutes of effort, "big_time" = a substantial block of focused work.',
    '- deadline: resolve relative dates (today, tomorrow, Friday) against the current date-time below; format as ISO 8601 with timezone.',
    '- timeSensitive: set true when urgency is implied WITHOUT a concrete date (e.g. "urgent", "asap").',
    `- Never output more than ${MAX_PARSED_TASKS} tasks.`,
    `Current date-time: ${new Date().toString()}`,
  ].join('\n');
}

// Tolerant top-level check only — anything that is not an array is a broken
// model contract (throw → INTERNAL_SERVER_ERROR); per-item weirdness is
// coerced or dropped instead.
const rawArraySchema = z.array(z.unknown());

function coerceDetails(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceSize(value: unknown): TaskSize | null {
  return typeof value === 'string' && (TASK_SIZES as readonly string[]).includes(value)
    ? (value as TaskSize)
    : null;
}

function coerceContexts(value: unknown): TaskContext[] {
  if (!Array.isArray(value)) return [];
  const contexts: TaskContext[] = [];
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (TASK_CONTEXTS as readonly string[]).includes(item) &&
      !contexts.includes(item as TaskContext)
    ) {
      contexts.push(item as TaskContext);
    }
  }
  return contexts;
}

function coerceDeadline(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

/**
 * Map a decoded model response to validated drafts. Pure — unit-tested with
 * canned JSON, no network. Tolerant per item (unknown contexts dropped, bad
 * sizes/dates coerced to null, non-objects and empty titles skipped), strict
 * about the top-level shape, clamped to MAX_PARSED_TASKS.
 */
export function mapModelResponse(raw: unknown): ParsedTaskDraft[] {
  const parsed = rawArraySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('AI model response was not a JSON array of tasks');
  }

  const drafts: ParsedTaskDraft[] = [];
  for (const item of parsed.data) {
    if (drafts.length >= MAX_PARSED_TASKS) break;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;

    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (title.length === 0) continue;

    drafts.push({
      title,
      details: coerceDetails(record.details),
      size: coerceSize(record.size),
      contexts: coerceContexts(record.contexts),
      deadline: coerceDeadline(record.deadline),
      timeSensitive: record.timeSensitive === true,
    });
  }
  return drafts;
}

/**
 * Decode the raw model body into drafts. A bare JSON.parse SyntaxError embeds
 * a snippet of the source (user-derived text) in its message, which tRPC and
 * the server's onError pino hook would propagate to logs and the client — so
 * parse failures are replaced with a generic error (NFR-S3).
 */
export function decodeModelResponse(body: string): ParsedTaskDraft[] {
  let raw: unknown;
  try {
    raw = JSON.parse(body) as unknown;
  } catch {
    throw new Error('AI model response was not valid JSON');
  }
  return mapModelResponse(raw);
}

// ---------------------------------------------------------------------------
// Task breakdown (Story 6.3)
// ---------------------------------------------------------------------------

const breakdownResponseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.STRING,
    description: 'One short, concrete, self-contained step (plain text, no numbering).',
  },
};

function buildBreakdownSystemInstruction(mode: BreakdownMode): string {
  const depthRule =
    mode === 'first_steps'
      ? 'Return EXACTLY 3 steps: just the first concrete actions needed to get moving — not the whole job.'
      : 'Return the COMPLETE plan as 5 to 8 steps, from getting started through finishing up.';

  return [
    'You break a task into small concrete steps for a person with ADHD who feels overwhelmed by it.',
    'Rules:',
    `- ${depthRule}`,
    '- The first step must be tiny and physical — something doable in under two minutes.',
    '- Each step is one short imperative sentence, self-contained, no numbering or bullet prefixes.',
    `- Keep every step under ${MAX_BREAKDOWN_STEP_CHARS} characters.`,
    '- Use the task details and working notes for context when they are provided.',
    '- Output a JSON array of strings, nothing else.',
  ].join('\n');
}

/** Assemble the user content from the task fields (details/notes optional). */
function buildTaskContents({ title, details, notes }: TaskPromptContext): string {
  const parts = [`Task: ${title}`];
  if (details) parts.push(`Details: ${details}`);
  if (notes) parts.push(`Working notes so far: ${notes}`);
  return parts.join('\n');
}

/**
 * Map a decoded breakdown response to a validated step list. Pure — unit
 * tested with canned JSON, no network. Non-string entries are dropped,
 * strings are trimmed (empties dropped) and truncated to
 * MAX_BREAKDOWN_STEP_CHARS; output is clamped to MAX_BREAKDOWN_STEPS.
 * A non-array top level or zero usable steps is a broken model contract
 * (throw → INTERNAL_SERVER_ERROR).
 */
export function mapBreakdownResponse(raw: unknown): string[] {
  const parsed = rawArraySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('AI model response was not a JSON array of steps');
  }

  const steps: string[] = [];
  for (const item of parsed.data) {
    if (steps.length >= MAX_BREAKDOWN_STEPS) break;
    if (typeof item !== 'string') continue;

    // truncateChars (not bare slice) — never splits a surrogate pair.
    const step = truncateChars(item.trim(), MAX_BREAKDOWN_STEP_CHARS).trimEnd();
    if (step.length > 0) steps.push(step);
  }

  if (steps.length === 0) {
    throw new Error('AI model returned no usable steps');
  }
  return steps;
}

/**
 * Decode the raw model body into steps. Same NFR-S3 rationale as
 * `decodeModelResponse`: a bare JSON.parse SyntaxError embeds a snippet of the
 * (task-derived) source text, so parse failures get a generic message.
 */
export function decodeBreakdownResponse(body: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(body) as unknown;
  } catch {
    throw new Error('AI model response was not valid JSON');
  }
  return mapBreakdownResponse(raw);
}

// ---------------------------------------------------------------------------
// Breakdown refine (Story 6.4)
// ---------------------------------------------------------------------------

const refineResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'One short, concrete, self-contained step (plain text, no numbering).',
      },
      description: 'Replacement steps for the not-yet-completed portion of the task.',
    },
    notesDistillation: {
      type: Type.STRING,
      nullable: true,
      description:
        'One line of durable facts distilled from the user feedback, or null when there are none.',
    },
  },
  required: ['steps'],
};

function buildRefineSystemInstruction(): string {
  return [
    'You revise a step-by-step task breakdown for a person with ADHD, based on their feedback about why the current steps miss the mark.',
    'Rules:',
    '- Steps marked [completed — keep, do not regenerate] are already done: NEVER restate or replace them. Return replacement steps for the remaining (not completed) portion only.',
    '- Return 3 to 8 replacement steps. The first must be tiny and physical — doable in under two minutes.',
    '- Each step is one short imperative sentence, self-contained, no numbering or bullet prefixes.',
    `- Keep every step under ${MAX_BREAKDOWN_STEP_CHARS} characters.`,
    `- notesDistillation: distill DURABLE facts from the feedback (constraints, preferences, context worth remembering) into one line under ${MAX_NOTES_DISTILLATION_CHARS} characters — or null when the feedback carries none.`,
    '- Output a JSON object with "steps" (array of strings) and "notesDistillation" (string or null), nothing else.',
  ].join('\n');
}

/** Task context + the current step list (completed ones flagged) + feedback. */
function buildRefineContents(input: RefineBreakdownInput): string {
  const parts = [buildTaskContents(input)];
  if (input.subtasks.length > 0) {
    parts.push('Current steps:');
    for (const subtask of input.subtasks) {
      const marker = subtask.completed
        ? '[completed — keep, do not regenerate]'
        : '[not completed — replace]';
      parts.push(`- ${marker} ${subtask.title}`);
    }
  }
  parts.push(`User feedback about the current steps: ${input.feedback}`);
  return parts.join('\n');
}

// Tolerant object check: steps must be present, distillation is coerced.
const rawRefineSchema = z.object({
  steps: z.array(z.unknown()),
  notesDistillation: z.unknown().optional(),
});

function coerceDistillation(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const distilled = truncateChars(value.trim(), MAX_NOTES_DISTILLATION_CHARS).trimEnd();
  return distilled.length > 0 ? distilled : null;
}

/**
 * Map a decoded refine response to validated output. Pure — unit-tested with
 * canned JSON, no network. Steps run through the same tolerance layer as a
 * breakdown (trim/drop/truncate/clamp; zero usable steps throws); the
 * distillation is coerced to null unless it is a non-empty string, and
 * truncated to MAX_NOTES_DISTILLATION_CHARS. A top level without a steps
 * array is a broken model contract (throw → INTERNAL_SERVER_ERROR).
 */
export function mapRefineResponse(raw: unknown): RefineBreakdownOutput {
  const parsed = rawRefineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('AI model response was not a JSON object with a steps array');
  }
  return {
    steps: mapBreakdownResponse(parsed.data.steps),
    notesDistillation: coerceDistillation(parsed.data.notesDistillation),
  };
}

/** Decode the raw refine body — generic parse-failure message (NFR-S3). */
export function decodeRefineResponse(body: string): RefineBreakdownOutput {
  let raw: unknown;
  try {
    raw = JSON.parse(body) as unknown;
  } catch {
    throw new Error('AI model response was not valid JSON');
  }
  return mapRefineResponse(raw);
}

// ---------------------------------------------------------------------------
// Micro-task suggestion (Story 6.4, FR39)
// ---------------------------------------------------------------------------

const microResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    step: {
      type: Type.STRING,
      description: 'The single smallest physical first step, under 100 characters.',
    },
  },
  required: ['step'],
};

function buildMicroSystemInstruction(): string {
  return [
    'You suggest ONE tiny first step for a task that a person with ADHD keeps skipping.',
    'Rules:',
    '- Return the single smallest PHYSICAL first step — something doable in under a minute, so small it feels almost silly.',
    '- One short imperative sentence, under 100 characters, no numbering.',
    '- Use the task details and working notes for context when they are provided.',
    '- Output a JSON object with a single "step" string, nothing else.',
  ].join('\n');
}

// Tolerant object check for the micro response.
const rawMicroSchema = z.object({ step: z.unknown() });

/**
 * Map a decoded micro-task response to a validated step. Pure — unit-tested
 * with canned JSON, no network. The step is trimmed and truncated to
 * MAX_BREAKDOWN_STEP_CHARS (it becomes a subtask title). A missing/non-string
 * /empty step is a broken model contract (throw → INTERNAL_SERVER_ERROR).
 */
export function mapMicroResponse(raw: unknown): string {
  const parsed = rawMicroSchema.safeParse(raw);
  if (!parsed.success || typeof parsed.data.step !== 'string') {
    throw new Error('AI model response was not a JSON object with a step string');
  }

  const step = truncateChars(parsed.data.step.trim(), MAX_BREAKDOWN_STEP_CHARS).trimEnd();
  if (step.length === 0) {
    throw new Error('AI model returned no usable step');
  }
  return step;
}

/** Decode the raw micro-task body — generic parse-failure message (NFR-S3). */
export function decodeMicroResponse(body: string): string {
  let raw: unknown;
  try {
    raw = JSON.parse(body) as unknown;
  } catch {
    throw new Error('AI model response was not valid JSON');
  }
  return mapMicroResponse(raw);
}

// Transport-level bound on every Gemini call (the SDK aborts the fetch when
// it fires). Without it a hung upstream request holds the Fastify request
// open indefinitely — the mobile client aborts at 5s and retries, stacking
// zombie server calls. 10s = generous ceiling over the NFR-P3 <3s target.
const GEMINI_TIMEOUT_MS = 10_000;

export function createGeminiProvider(apiKey: string): AiProvider {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GEMINI_TIMEOUT_MS } });

  return {
    async parseBrainDump(text: string): Promise<ParsedTaskDraft[]> {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: text,
        config: {
          systemInstruction: buildSystemInstruction(),
          responseMimeType: 'application/json',
          responseSchema,
          // No thinking — fast + cheap; structured extraction needs none (NFR-P3 <3s).
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const body = response.text;
      if (!body) {
        throw new Error('AI model returned an empty response');
      }
      return decodeModelResponse(body);
    },

    async breakdownTask(input: BreakdownTaskInput): Promise<string[]> {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: buildTaskContents(input),
        config: {
          systemInstruction: buildBreakdownSystemInstruction(input.mode),
          responseMimeType: 'application/json',
          responseSchema: breakdownResponseSchema,
          // No thinking — fast + cheap; short step lists need none (NFR-P3 <3s).
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const body = response.text;
      if (!body) {
        throw new Error('AI model returned an empty response');
      }
      return decodeBreakdownResponse(body);
    },

    async refineBreakdown(input: RefineBreakdownInput): Promise<RefineBreakdownOutput> {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: buildRefineContents(input),
        config: {
          systemInstruction: buildRefineSystemInstruction(),
          responseMimeType: 'application/json',
          responseSchema: refineResponseSchema,
          // No thinking — fast + cheap; a short revision needs none (NFR-P3 <3s).
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const body = response.text;
      if (!body) {
        throw new Error('AI model returned an empty response');
      }
      return decodeRefineResponse(body);
    },

    async suggestMicroTask(input: TaskPromptContext): Promise<string> {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: buildTaskContents(input),
        config: {
          systemInstruction: buildMicroSystemInstruction(),
          responseMimeType: 'application/json',
          responseSchema: microResponseSchema,
          // No thinking — fast + cheap; one tiny step needs none (NFR-P3 <3s).
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const body = response.text;
      if (!body) {
        throw new Error('AI model returned an empty response');
      }
      return decodeMicroResponse(body);
    },
  };
}
