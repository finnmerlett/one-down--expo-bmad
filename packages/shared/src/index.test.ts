import { expect, test } from 'bun:test';

import { DRIZZLE_SCHEMA_PLACEHOLDER, PROJECT_PACKAGE_NAME } from './index';

test('exports scaffold placeholders', () => {
  expect(PROJECT_PACKAGE_NAME).toBe('@one-down/shared');
  expect(DRIZZLE_SCHEMA_PLACEHOLDER).toEqual({});
});
