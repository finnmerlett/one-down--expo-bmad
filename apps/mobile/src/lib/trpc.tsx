import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState, type ReactNode } from 'react';
import superjson from 'superjson';

// TYPE-ONLY import — a value import would force Metro to bundle
// Fastify/drizzle/postgres.js into the app.
import type { AppRouter } from '@one-down/server';

import { getApiBaseUrl } from './api-url';
import { supabase } from './supabase';

export const trpc = createTRPCReact<AppRouter>();

const REQUEST_TIMEOUT_MS = 5_000;

// fetch wrapper with a hard 5s timeout; also forwards an external signal's
// abort so react-query cancellation still works.
export async function timeoutFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Shared link config for both clients. superjson (Story 5.3) mirrors the
// server's `transformer: superjson` — tRPC v11 enforces the symmetry; Dates
// cross the wire as real Dates.
function createLinks() {
  return [
    httpBatchLink({
      transformer: superjson,
      url: `${getApiBaseUrl()}/trpc`,
      fetch: timeoutFetch,
      // Reads supabase directly (not React state) — no provider-order
      // race. Signed out = header omitted entirely (local-only free tier).
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
  ];
}

// Vanilla (non-React) client — the sync service's transport (Story 5.3).
// Hook-based `trpc.sync.*.useMutation` would be the wrong altitude there.
export const trpcClient = createTRPCClient<AppRouter>({ links: createLinks() });

// Client + QueryClient are instantiated exactly once (useState initializers).
export function TrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );
  const [client] = useState(() => trpc.createClient({ links: createLinks() }));

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
