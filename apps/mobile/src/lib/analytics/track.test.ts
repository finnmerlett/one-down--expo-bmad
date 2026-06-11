import { setAnalyticsClient, track, type AnalyticsClient } from './track';

describe('track', () => {
  afterEach(() => {
    setAnalyticsClient(null);
    jest.restoreAllMocks();
  });

  it('routes typed events to the wired client untouched', () => {
    const capture = jest.fn();
    const client: AnalyticsClient = { capture };
    setAnalyticsClient(client);

    track('task_created', { source: 'quick_add', has_details: true });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('task_created', {
      source: 'quick_add',
      has_details: true,
    });
  });

  it('is a safe no-op (console fallback) when no client is wired', () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});

    expect(() => track('task_created', { source: 'quick_add', has_details: false })).not.toThrow();

    expect(debug).toHaveBeenCalledTimes(1);
  });
});
