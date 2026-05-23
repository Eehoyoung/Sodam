import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';
// SKIP: lightweight @testing-library/react-native mock 으로는 실제 navigation reset 호출 불가.
// → Phase 3 에서 real RTL render 로 재작성 예정.

// Mocks
jest.mock('../../src/contexts/AuthContext', () => {
  const actual = jest.requireActual('../../src/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: mockLogin,
      logout: jest.fn(),
      kakaoLogin: jest.fn(),
    }),
  };
});

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      reset: mockReset,
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

const mockLogin = jest.fn(async (email: string, password: string) => ({ id: 1, role: 'MASTER' }));

// Auto-press Alert first button
jest.spyOn(Alert, 'alert').mockImplementation(((title: any, message?: any, buttons?: any) => {
  if (buttons && Array.isArray(buttons) && buttons[0] && typeof buttons[0].onPress === 'function') {
    buttons[0].onPress();
  }
  return undefined as any;
}) as any);

describe.skip('Navigation role landing (Login → HomeRoot with params.screen)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset.mockClear();
  });

  test('MASTER role lands on MasterMyPageScreen', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('이메일을 입력하세요'), 'user@sodam.com');
    fireEvent.changeText(getByPlaceholderText('비밀번호를 입력하세요'), 'password');
    fireEvent.press(getByText('로그인'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      const arg = mockReset.mock.calls[0][0];
      expect(arg).toBeTruthy();
      const routes = arg.routes || [];
      expect(routes[0].name).toBe('HomeRoot');
      expect(routes[0].params).toBeTruthy();
      expect(routes[0].params.screen).toBe('MasterMyPageScreen');
    });
  });

  test('EMPLOYEE role lands on EmployeeMyPageScreen', async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, role: 'EMPLOYEE' });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('이메일을 입력하세요'), 'user@sodam.com');
    fireEvent.changeText(getByPlaceholderText('비밀번호를 입력하세요'), 'password');
    fireEvent.press(getByText('로그인'));

    await waitFor(() => {
      const arg = mockReset.mock.calls[0][0];
      const routes = arg.routes || [];
      expect(routes[0].params.screen).toBe('EmployeeMyPageScreen');
    });
  });
});
