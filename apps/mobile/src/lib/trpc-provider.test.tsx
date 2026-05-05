import { cleanup, render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { trpc } from './trpc';
import { TrpcProvider } from './trpc-provider';

function HealthConsumer() {
  const result = trpc.health.useQuery();
  if (result.isLoading) {
    return (
      <View>
        <Text>loading</Text>
      </View>
    );
  }
  if (result.isError) {
    return (
      <View>
        <Text>error</Text>
      </View>
    );
  }
  return (
    <View>
      <Text>{result.data?.status ?? 'no-data'}</Text>
    </View>
  );
}

describe('TrpcProvider', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalEnv;
    }
  });

  test('renders children and a child consuming trpc.health.useQuery() reaches the configured URL', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.onedown.test';

    const fetchMock = jest.fn(
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
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const { getByText } = render(
      <TrpcProvider>
        <HealthConsumer />
      </TrpcProvider>,
    );

    expect(getByText('loading')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('ok')).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    const calledUrl = firstCall?.[0];
    expect(String(calledUrl)).toContain('http://api.onedown.test/trpc/health');
  });
});
