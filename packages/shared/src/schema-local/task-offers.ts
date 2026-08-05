import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Don't-skip offer state (v1.5 Row E, story D2). LOCAL-ONLY by design: an
// offer is a per-device engagement mechanic ("one live offer at a time" is a
// device-level rule), so it never syncs and never mirrors to Postgres. One
// row per task that currently carries — or has spent — an offer. No FK
// constraint, same rationale as subtasks.
export const taskOffers = sqliteTable('task_offers', {
  taskId: text('task_id').primaryKey(),
  /** Current badge amount; 0 = eroded to nothing (spent). */
  amount: integer('amount').notNull(),
  /** Set when the offer erodes to 0 — starts the re-offer cooldown. */
  spentAt: integer('spent_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type TaskOfferRow = typeof taskOffers.$inferSelect;
export type NewTaskOfferRow = typeof taskOffers.$inferInsert;
