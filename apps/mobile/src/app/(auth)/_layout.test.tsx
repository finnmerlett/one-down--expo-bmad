jest.mock('expo-router', () => ({
  Stack: jest.fn(({ children }) => children),
}));

import { render } from '@testing-library/react-native';
import React from 'react';

import AuthLayout from './_layout';

describe('AuthLayout', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(<AuthLayout />);
    expect(toJSON()).toBeNull();
  });
});
