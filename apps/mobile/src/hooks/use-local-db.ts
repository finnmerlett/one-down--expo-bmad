import { type AppDatabase, getLocalDb } from '@/lib/local-db';

export function useLocalDb(): AppDatabase {
  return getLocalDb();
}
