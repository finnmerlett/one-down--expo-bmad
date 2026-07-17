// Mobile-side Drizzle schema (expo-sqlite). Import via
// `@one-down/shared/schema-local` — deliberately NOT re-exported from the
// package root: the `.` barrel must never pull table definitions (and the
// mobile bundle must never see drizzle-orm/pg-core via `./schema`).
export { tasks, type NewTaskRow, type TaskRow } from './tasks';
export { starActivityLog, type NewStarActivityRow, type StarActivityRow } from './star-activity';
