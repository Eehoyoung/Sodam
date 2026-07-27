import type {Preview} from '@storybook/react-native-web-vite';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider} from '../src/common/providers/ThemeProvider';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// SafeAreaProviderGuard(common/providers)는 "네이티브 뷰 매니저가 등록됐는지" 확인해
// 없으면 일부러 plain View로 폴백한다(Bridgeless/Fabric에서 네이티브 모듈이 아직
// 안 붙었을 때를 위한 앱 안정성 가드). 웹(react-native-web)에서는 애초에 네이티브
// 뷰 매니저 개념이 없어 그 체크가 항상 실패로 나오고, react-native-safe-area-context는
// 이미 자체 웹 구현체가 있으므로 여기서는 가드 없이 SafeAreaProvider를 바로 쓴다.

// 화면(screens) 스토리는 useNavigation()/TanStack Query 훅에 의존하는 경우가 많다.
// 실제 화면 컴포넌트를 수정하지 않고도 렌더링되도록 전역으로 감싸준다.
// - NavigationContainer: useNavigation()이 "navigation object를 찾을 수 없다"며 던지는 것을 방지.
//   실제 네비게이터 트리는 없으므로 navigate() 호출은 콘솔에 경고만 남기고 조용히 무시된다.
// - QueryClient: 스토리 렌더마다 새로 생성해 스토리 간 캐시가 섞이지 않게 한다.
const createStorybookQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {retry: false, staleTime: Infinity},
        mutations: {retry: false},
    },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },

  // 소담 v3 컴포넌트는 useThemeColors()/ThemeProvider 컨텍스트에 의존한다.
  // 툴바에서 라이트/다크를 전환하면 forcedMode 로 실제 팔레트가 즉시 바뀐다.
  globalTypes: {
    theme: {
      description: '소담 라이트/다크 테마',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          {value: 'light', title: '라이트'},
          {value: 'dark', title: '다크'},
        ],
      },
    },
  },

  decorators: [
    (Story, context) => (
      <QueryClientProvider client={createStorybookQueryClient()}>
        <NavigationContainer independent>
          <ThemeProvider forcedMode={context.globals.theme === 'dark' ? 'dark' : 'light'}>
            <SafeAreaProvider initialMetrics={{
              frame: {x: 0, y: 0, width: 390, height: 844},
              insets: {top: 47, left: 0, right: 0, bottom: 34},
            }}>
              <Story />
            </SafeAreaProvider>
          </ThemeProvider>
        </NavigationContainer>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
