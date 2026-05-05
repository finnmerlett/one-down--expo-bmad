const mockCreateClient = jest.fn(() => ({
  auth: { onAuthStateChange: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('supabase client', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test('initializes with secure-store adapter when env vars are set', () => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    };
    jest.resetModules();

    const { supabase } = require('./supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    );
    expect(supabase).toBeTruthy();
  });

  test('exports null when env vars are missing', () => {
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();
    mockCreateClient.mockClear();

    const { supabase } = require('./supabase');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(supabase).toBeNull();
  });
});
