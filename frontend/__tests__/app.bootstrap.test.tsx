import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';

// SKIP: 전체 App tree mount — react-native-reanimated/gesture-handler/navigation 통합 mock 필요.
// → Phase 3 e2e bootstrap 테스트로 재작성.
describe.skip('App bootstrap', () => {
  test('renders without crashing and exports component', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = ReactTestRenderer.create(React.createElement(App));
    });
    expect(renderer).toBeTruthy();
    const tree = renderer!.toJSON();
    expect(tree).toBeTruthy();
  });
});
