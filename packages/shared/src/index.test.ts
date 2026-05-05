import { expect, test } from 'bun:test';

import { PROJECT_PACKAGE_NAME } from './index';

test('exports the workspace package name', () => {
  expect(PROJECT_PACKAGE_NAME).toBe('@one-down/shared');
});
