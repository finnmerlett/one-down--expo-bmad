// Shape of drizzle-kit's generated drizzle/migrations.js (expo driver).
declare module '*/drizzle/migrations' {
  interface JournalEntry {
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }
  const migrations: {
    journal: { version: string; dialect: string; entries: JournalEntry[] };
    migrations: Record<string, string>;
  };
  export default migrations;
}
