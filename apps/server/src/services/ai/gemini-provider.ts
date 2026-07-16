import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  GEMINI_MODEL,
  MAX_PARSED_TASKS,
  TASK_CONTEXTS,
  TASK_SIZES,
  type ParsedTaskDraft,
  type TaskContext,
  type TaskSize,
} from '@one-down/shared';
import { z } from 'zod';

import type { AiProvider } from './provider';

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

export function createGeminiProvider(apiKey: string): AiProvider {
  const ai = new GoogleGenAI({ apiKey });

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
  };
}
