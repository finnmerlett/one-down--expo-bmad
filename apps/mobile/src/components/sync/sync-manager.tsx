import { useSync } from '@/hooks/use-sync';

// Renders nothing — hosts the sync triggers (Story 5.3) so they only ever run
// behind the MigrationGate (sync reads/writes SQLite) and inside the Auth and
// Trpc providers.
export function SyncManager() {
  useSync();
  return null;
}
