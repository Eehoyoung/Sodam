import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import WelcomeMainScreen from '../../src/features/welcome/screens/SodamLandingScreen';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';

// We will spy on useNavigation from the (already globally mocked) module in jest.setup.js
const getNavModule = () => require('@react-navigation/native');

// SKIP: WelcomeMainScreen 내부 Animated.parallel 호출이 jest mock 의 undefined 반환에 의존.
// → Phase 3 에서 react-native-reanimated 실제 mock + RTL real-render 로 재작성.
describe.skip('Moderate Navigation Flow (Welcome → Auth → Home)', () => {
  let mockNavigate: jest.Mock;
  let mockReset: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    mockReset = jest.fn();

    const navModule = getNavModule();
    jest.spyOn(navModule, 'useNavigation').mockImplementation(() => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: mockReset,
    } as any));
  });

  test('WelcomeMainScreen renders and has 시작하기 CTA (snapshot smoke)', () => {
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(React.createElement(WelcomeMainScreen));
    });
    const tree = renderer!.toJSON();
    expect(tree).toBeTruthy();

    // Find the 시작하기 button by accessibilityLabel
    const startButtons = renderer!.root.findAll((node: any) => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === '시작하기 (로그인으로 이동)');
    expect(startButtons.length).toBe(1);
  });

  test('Welcome → Auth(Login) navigation when pressing 시작하기', () => {
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(React.createElement(WelcomeMainScreen));
    });
    const startButton = renderer.root.find((node: any) => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === '시작하기 (로그인으로 이동)');

    act(() => {
      startButton.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('Auth', { screen: 'Login' });
  });

  test('Login success resets to HomeRoot (clears back stack)', () => {
    const authNavMock = { navigate: jest.fn() } as any; // minimal Auth stack nav prop
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(React.createElement(LoginScreen, { navigation: authNavMock }));
    });

    // Find RN Button by title="로그인 성공"
    const loginButtons = renderer.root.findAll((node: any) => node.type === 'Button' && node.props.title === '로그인 성공');
    expect(loginButtons.length).toBe(1);

    act(() => {
      loginButtons[0].props.onPress();
    });

    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeRoot' }] });
  });
});
