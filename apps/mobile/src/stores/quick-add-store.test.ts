import { useQuickAddStore } from './quick-add-store';

describe('useQuickAddStore', () => {
  beforeEach(() => {
    useQuickAddStore.setState({ isOpen: false });
  });

  test('starts closed', () => {
    expect(useQuickAddStore.getState().isOpen).toBe(false);
  });

  test('open() sets isOpen to true', () => {
    useQuickAddStore.getState().open();
    expect(useQuickAddStore.getState().isOpen).toBe(true);
  });

  test('close() sets isOpen to false', () => {
    useQuickAddStore.getState().open();
    useQuickAddStore.getState().close();
    expect(useQuickAddStore.getState().isOpen).toBe(false);
  });

  test('open()/close() are idempotent', () => {
    useQuickAddStore.getState().open();
    useQuickAddStore.getState().open();
    expect(useQuickAddStore.getState().isOpen).toBe(true);
    useQuickAddStore.getState().close();
    useQuickAddStore.getState().close();
    expect(useQuickAddStore.getState().isOpen).toBe(false);
  });
});
