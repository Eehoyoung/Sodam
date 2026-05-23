/**
 * 메인 App 컴포넌트 — 최소 의존/안정성 우선 진입점
 * 목적: 크래시 없이 가볍게 시작하고, 단계적으로 기능을 재도입하며 안정성을 검증합니다.
 *
 * 포함된 안정성 가드(핵심):
 * - InitializationErrorBoundary: 초기 타이밍 이슈(ReactNoCrashSoftException) 보호
 * - GestureHandlerRootView / SafeAreaProvider / ErrorBoundary / ThemeProvider
 * - react-native-screens enableScreens(true) — 네이티브 모듈 존재 시에만 가드 호출
 */
import React, {useEffect, useState} from 'react';
import {InteractionManager, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import InitializationErrorBoundary from './src/components/InitializationErrorBoundary';
import ThemeProvider from './src/common/providers/ThemeProvider';
import {ENABLE_SCREENS_NATIVE, stageAtLeast} from './src/navigation/config';
import AuthMockProvider from './src/contexts/AuthMockProvider';
import {AuthProvider} from './src/contexts/AuthContext';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './src/common/utils/queryClient';
import {logRecovery, logWsodFix, logTimingCoordination} from './src/utils/logger';

declare global {
  // 앱 시작 시각(디버깅/타이밍 분석용) — 필요 시 최초 1회만 기록
  // eslint-disable-next-line no-var
  var __APP_START_TIME__: number | undefined;
}

const App: React.FC = () => {
  // 1) 마운트 시 진단용 로그/타임스탬프 기록
  useEffect(() => {
    logRecovery('App baseline mounted');
    console.log('[CONTEXT_READINESS] React Native context is now ready');

    if (typeof global !== 'undefined' && !global.__APP_START_TIME__) {
      global.__APP_START_TIME__ = Date.now();
    }
  }, []);

  // 2) react-native-screens 활성화 (네이티브 모듈이 있는 환경에서만)
  //    - 콘솔 경고/모듈 부재로 인한 오류를 피하기 위해 동적 require + 가드 사용
  try {
    if (ENABLE_SCREENS_NATIVE && stageAtLeast(7)) {
      // 웹/테스트 번들 이슈 방지를 위해 동적 로드
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const screens = require('react-native-screens');
      if (typeof screens?.enableScreens === 'function') {
        screens.enableScreens(true);
      }
    }
  } catch (e) {
    const error = e as Error;
    logRecovery(`enableScreens skipped: ${error?.message || String(e)}`);
  }

  // 3) 첫 인터랙션 이후 렌더링 준비 상태(appReady) 표시
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setAppReady(true);
      logRecovery('App interaction readiness achieved');
    });
    return () => {
      task?.cancel?.();
    };
  }, []);

  // 4) WSOD 대응: 복잡한 선행 검증 로직을 생략하고 즉시 UI 렌더링
  logWsodFix('복잡한 초기 검증을 생략하고 UI를 즉시 렌더링합니다.');

  // 5) (과거 문제 회피용) contextReady 체크로 인한 초기 백색 화면 이슈 때문에 비활성화
  //    필요 시 아래 게이트를 복구하여 NavigationContainer 마운트 시점을 늦출 수 있습니다.
  // if (!contextReady) {
  //   return (
  //     <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
  //       <ActivityIndicator size="large" color={colors.brandPrimary} />
  //       <Text style={{marginTop: 12, color: colors.textSecondary}}>Preparing UI...</Text>
  //     </View>
  //   );
  // }
  logRecovery('contextReady 게이트를 우회하고 NavigatorTree를 즉시 렌더링합니다.');

  // 6) 내비게이터를 지연 로딩(동적 import)하여 번들/테스트 안정성 확보
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _NavModule = require('./src/navigation/AppNavigator');
  const FallbackNav: React.FC<{appReady?: boolean}> = () => null;
  const AppNavigator = (_NavModule?.default ?? _NavModule) || FallbackNav;
  const NavigatorTree = <AppNavigator appReady={appReady} />;

  // 7) 화면 단위 에러 바운더리(선택적)
  const WrappedByLocalBoundary = stageAtLeast(16) ? (
    <ErrorBoundary>{NavigatorTree}</ErrorBoundary>
  ) : (
    NavigatorTree
  );

  // 8) 인증 컨텍스트(실 서비스) → 필요 시 Mock Provider로 추가 래핑
  const WithRealAuth = <AuthProvider>{WrappedByLocalBoundary}</AuthProvider>;
  const WithAuthMock = stageAtLeast(17) ? (
    <AuthMockProvider>{WithRealAuth}</AuthMockProvider>
  ) : (
    WithRealAuth
  );

  // 9) ReactNoCrashSoftException 등 타이밍 이슈 로깅 핸들러
  const handleTimingIssue = (_error: Error, _errorInfo: React.ErrorInfo) => {
    logTimingCoordination('ReactNoCrashSoftException detected during app lifecycle');
    // TODO: 필요 시 모니터링/분석 툴 연계
  };

  // 10) 안정성 레이어(Provider) 트리 구성
  return (
    <GestureHandlerRootView style={styles.container}>
      <InitializationErrorBoundary onTimingIssue={handleTimingIssue}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ErrorBoundary>
              <ThemeProvider>{WithAuthMock}</ThemeProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </QueryClientProvider>
      </InitializationErrorBoundary>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
