import { screenNameFromSegments } from './use-screen-tracking';

// The hook itself is a thin effect (don't test the framework) — the mapping
// is the meaningful logic: route TEMPLATES only, never concrete ids (AC2).
describe('screenNameFromSegments', () => {
  it('maps the empty segment list (index route) to home', () => {
    expect(screenNameFromSegments([])).toBe('home');
  });

  it('joins template segments, keeping dynamic placeholders low-cardinality', () => {
    expect(screenNameFromSegments(['task', '[id]'])).toBe('task/[id]');
    expect(screenNameFromSegments(['task-running', '[id]'])).toBe('task-running/[id]');
  });

  it('maps single-segment routes to their name', () => {
    expect(screenNameFromSegments(['task-list'])).toBe('task-list');
    expect(screenNameFromSegments(['premium'])).toBe('premium');
    expect(screenNameFromSegments(['settings'])).toBe('settings');
  });
});
