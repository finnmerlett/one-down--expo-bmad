import { emptyStackCopy } from './empty-stack-copy';

describe('emptyStackCopy', () => {
  it('names a single active context', () => {
    expect(emptyStackCopy(['home'], null)).toEqual({
      title: 'Nothing here for Home',
      body: 'Try another context.',
    });
  });

  it('generalizes over several active contexts', () => {
    expect(emptyStackCopy(['home', 'phone'], null)).toEqual({
      title: 'Nothing for these contexts',
      body: 'Try another context.',
    });
  });

  it('names the mode when only a mode is active', () => {
    expect(emptyStackCopy([], 'quick_win')).toEqual({
      title: 'No quick wins right now',
      body: 'Try switching mode.',
    });
    expect(emptyStackCopy([], 'big_time')).toEqual({
      title: 'No big time tasks right now',
      body: 'Try switching mode.',
    });
  });

  it('combines mode and single context, suggesting both ways out', () => {
    expect(emptyStackCopy(['home'], 'big_time')).toEqual({
      title: 'No big time tasks for Home',
      body: 'Try another context or switch mode.',
    });
  });

  it('combines mode with several contexts', () => {
    expect(emptyStackCopy(['home', 'laptop'], 'quick_win')).toEqual({
      title: 'No quick wins for these contexts',
      body: 'Try another context or switch mode.',
    });
  });
});
