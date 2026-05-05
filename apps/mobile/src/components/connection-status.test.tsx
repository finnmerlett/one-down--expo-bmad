import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { httpBatchLink } from '@trpc/client';
import type { ReactNode } from 'react';

import { trpc } from '@/lib/trpc';

import { ConnectionStatus } from './connection-status';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: 'http://test.local/trpc' })],
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    );
  }

  return { Wrapper, queryClient };
}

describe('ConnectionStatus', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('renders the "Checking…" state while the health query is loading', () => {
    globalThis.fetch = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof globalThis.fetch;

    const { Wrapper } = makeWrapper();
    const { getByText, getByLabelText } = render(
      <Wrapper>
        <ConnectionStatus />
      </Wrapper>,
    );

    expect(getByText('Checking…')).toBeTruthy();
    expect(getByLabelText('Checking server connection')).toBeTruthy();
  });

  test('renders the "Connected" state when the health query resolves with status:ok', async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              result: {
                data: {
                  status: 'ok',
                  service: 'one-down-api',
                  sharedPackage: '@one-down/shared',
                  timestamp: '2026-05-05T00:00:00.000Z',
                },
              },
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof globalThis.fetch;

    const { Wrapper } = makeWrapper();
    const { getByText, getByLabelText } = render(
      <Wrapper>
        <ConnectionStatus />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('Connected')).toBeTruthy();
    });
    expect(getByLabelText('Server connected')).toBeTruthy();
  });

  test('renders the "Offline" state when the health query rejects', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network error');
    }) as unknown as typeof globalThis.fetch;

    const { Wrapper } = makeWrapper();
    const { getByText, getByLabelText } = render(
      <Wrapper>
        <ConnectionStatus />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('Offline')).toBeTruthy();
    });
    expect(getByLabelText('Server offline')).toBeTruthy();
  });
});
