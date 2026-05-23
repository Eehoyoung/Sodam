import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../../src/navigation/AppNavigator';

// Mock Auth to avoid redirects
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, loading: false, login: jest.fn(), logout: jest.fn(), kakaoLogin: jest.fn() }),
}));

describe('AppNavigator initial route', () => {
  test('initial route is Welcome (UsageSelectionScreen)', async () => {
    const { findByText } = render(<AppNavigator />);
    const el = await findByText('어떻게 사용하고 싶으세요?');
    expect(el).toBeTruthy();
  });
});
