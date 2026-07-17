// Mobile-side Drizzle schema (expo-sqlite). Import via
// `@one-down/shared/schema-local` — deliberately NOT re-exported from the
// package root: the `.` barrel must never pull table definitions (and the
// mobile bundle must never see drizzle-orm/pg-core via `./schema`).
export { preferences, type NewPreferenceRow, type PreferenceRow } from './preferences';
export { tasks, type NewTaskRow, type TaskRow } from './tasks';
