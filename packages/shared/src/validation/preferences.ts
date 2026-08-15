import { z } from 'zod';

import type { PreferenceData } from '../types/preference';

// Server-side input validation for preference sync upserts (Story 9.7).
// Keys are app-defined strings, scoped per-user by the (userId, key) PK.
// Value size is capped defensively: the largest legitimate value is the AI
// general notes (2k chars) JSON-encoded — 16k leaves generous headroom while
// keeping a runaway client from stuffing megabytes into a preference row.
export const preferenceUpsertSchema = z.object({
  key: z.string().min(1).max(256),
  value: z.string().max(16_384),
  deletedAt: z.date().nullable(),
  updatedAt: z.date(),
}) satisfies z.ZodType<PreferenceData>;

export type PreferenceUpsert = z.infer<typeof preferenceUpsertSchema>;
