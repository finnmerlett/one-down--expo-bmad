const mockGetSession = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: (...a: never[]) => mockGetSession(...a),
    },
  },
}));

import { createQueryClient, createTrpcClient, getApiBaseUrl } from './trpc';

describe('getApiBaseUrl', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalEnv;
    }
  });

  test('returns the env value when EXPO_PUBLIC_API_URL is set', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  test('strips a trailing slash from the env value', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.onedown.test/';
    expect(getApiBaseUrl()).toBe('http://api.onedown.test');
  });

  test('strips multiple trailing slashes', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.onedown.test///';
    expect(getApiBaseUrl()).toBe('http://api.onedown.test');
  });

  test('falls back to http://localhost:3000 when EXPO_PUBLIC_API_URL is unset', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  test('falls back to http://localhost:3000 when EXPO_PUBLIC_API_URL is empty', () => {
    process.env.EXPO_PUBLIC_API_URL = '';
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });
});

describe('createTrpcClient', () => {
  test('returns a typed tRPC client whose health proxy is a function', () => {
    const client = createTrpcClient();
    expect(client).toBeDefined();
    expect(typeof client.health.query).toBe('function');
  });

  test('does not call fetch at construction time', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    createTrpcClient();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('createQueryClient', () => {
  test('returns a QueryClient instance with the configured defaults', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.staleTime).toBe(30_000);
  });
});

describe('JWT header injection', () => {
  test('includes Authorization header when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'test-jwt-token' },
      },
    });

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ result: { data: { status: 'ok' } } }]), {
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createTrpcClient();
    try {
      await client.health.query();
    } catch {
      // tRPC may error but we only care about the fetch call
    }

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0]!;
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers).toEqual(expect.objectContaining({ Authorization: 'Bearer test-jwt-token' }));

    fetchSpy.mockRestore();
  });

  test('omits Authorization header when no session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ result: { data: { status: 'ok' } } }]), {
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createTrpcClient();
    try {
      await client.health.query();
    } catch {
      // tRPC may error but we only care about the fetch call
    }

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0]!;
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    fetchSpy.mockRestore();
  });
});
