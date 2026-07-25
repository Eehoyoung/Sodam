import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../../src/navigation/AppNavigator';

// Mock Auth to avoid redirects
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, loading: false, login: jest.fn(), logout: jest.fn(), kakaoLogin: jest.fn() }),
}));

describe('AppNavigator initial route', () => {
  test('initial route is Welcome (SodamLandingScreen)', async () => {
    const { findByText } = render(<AppNavigator />);
    const el = await findByText('GPS·NFC 출퇴근, 자동 급여 계산, 직원 명세 확인을 한 번에.');
    expect(el).toBeTruthy();
  });
});
