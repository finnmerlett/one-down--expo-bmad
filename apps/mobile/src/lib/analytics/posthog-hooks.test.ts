import { PostHog } from 'posthog-react-native';

import { posthogBeforeSend } from './posthog-hooks';

// NFR-S3 smoke test required by docs/posthog-integration.md: prove the
// before_send hook fires on a normal (non-exception) capture() in the pinned
// SDK version, using a REAL PostHog instance with in-memory persistence.
describe('posthogBeforeSend wired into the real SDK', () => {
  let posthog: PostHog;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(async () => ({
      status: 200,
      json: async () => ({ status: 'ok' }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(async () => {
    await posthog.shutdown();
  });

  it('redacts task content from capture() events before they reach the wire', async () => {
    posthog = new PostHog('phc_test_key', {
      persistence: 'memory',
      flushAt: 1,
      flushInterval: 0,
      captureAppLifecycleEvents: false,
      disableRemoteConfig: true,
      preloadFeatureFlags: false,
      disableSurveys: true,
      disableCompression: true,
      before_send: posthogBeforeSend,
    });
    await posthog.ready();

    posthog.capture('task_created', { source: 'quick_add', title: 'very private task text' });
    await posthog.flush();

    const batchCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/batch'));
    expect(batchCall).toBeDefined();
    const rawBody = batchCall?.[1]?.body as string | Blob;
    const body = JSON.parse(typeof rawBody === 'string' ? rawBody : await rawBody.text());
    const event = body.batch.find((entry: { event: string }) => entry.event === 'task_created');
    expect(event).toBeDefined();
    expect(event.properties.source).toBe('quick_add');
    expect(event.properties.title).toBe('[redacted:nfr-s3]');
  });
});
