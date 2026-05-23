/**
 * Entry point for Sodam App
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import {AppRegistry, LogBox} from 'react-native';
import {name as appName} from './app.json';


// 개발 환경에서만 불필요한 경고 숨기기
if (__DEV__) {
    LogBox.ignoreLogs([
        'ENOENT: no such file or directory',
        /DevTools.*/,
        'Launching DevTools',
        'debugger-frontend',
        'ko.json',
        'Require cycle:',
        'Remote debugger',
        'Setting a timer',
        'Simulated error coming from DevTools', // DevTools 시뮬레이션 오류
        'Error: Simulated error coming from DevTools',
        'Warning: Error: Simulated error coming from DevTools',
        'An error was thrown when attempting to render log messages via LogBox', // LogBox 렌더링 오류
        /VM\d+:\d+.*DevTools.*/, // VM 스크립트의 DevTools 관련 메시지
        /VM\d+:\d+.*Error.*LogBox.*/, // VM 스크립트의 LogBox 렌더링 오류
        /Simulated error.*/, // 시뮬레이션 오류 관련 모든 메시지
        /An error was thrown.*LogBox.*/, // LogBox 렌더링 오류 관련 모든 메시지
    ]);

    // 특정 네이티브 모듈 미연결 에러 무시 (react-native-screens, RNGestureHandler)
    const originalConsoleError = console.error;
    console.error = (...args) => {
        try {
            const flat = args.map(a => (a instanceof Error ? (a.message || String(a)) : (typeof a === 'string' ? a : JSON.stringify(a)))).join(' ');
            if (!flat) {
                return originalConsoleError(...args);
            }
            if (flat.includes("Screen native module hasn't been linked")) {
                // Drop this error to keep Logcat clean during staged recovery
                return;
            }
        } catch (e) {
            // swallow to keep console stable during staged recovery
        }
        originalConsoleError(...args);
    };
}

console.log('[DEBUG_LOG] About to require AppComponent from ./App.tsx');

// JSC 전환 확인 코드
if (__DEV__) {
    console.log('🚀 JavaScript Engine:', global.HermesInternal ? 'Hermes' : 'JSC');
    console.log('🏗️ New Architecture:', global.RN$Bridgeless ? 'Enabled' : 'Disabled');
    console.log('🎨 Reanimated:', global._REANIMATED_VERSION_JS || 'Loading...');
}

// AppComponent 임포트 (점진적 로딩을 위한 에러 핸들링 포함)
let AppComponent;
try {
    AppComponent = require('./App.tsx').default;
    console.log('[DEBUG_LOG] AppComponent loaded successfully');
} catch (error) {
    console.error('[DEBUG_LOG] Failed to load AppComponent:', error);
    console.error('Failed to load AppComponent:', error);

    // 폴백 컴포넌트
    const React = require('react');
    const {View, Text} = require('react-native');

    AppComponent = () => React.createElement(
        View,
        {style: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}},
        React.createElement(Text,
            {style: {fontSize: 18, textAlign: 'center', color: 'red', marginBottom: 10}},
            '앱 로딩 중 오류가 발생했습니다'
        ),
        React.createElement(Text,
            {style: {fontSize: 14, textAlign: 'center', color: '#666'}},
            '개발자에게 문의하세요'
        )
    );
}

console.log('[DEBUG_LOG] About to register component');
try {
    AppRegistry.registerComponent(appName, () => AppComponent);
    console.log('[DEBUG_LOG] Component registered successfully');
} catch (error) {
    console.error('[DEBUG_LOG] Component registration failed:', error);
}

console.log('[DEBUG_LOG] === INDEX.JS END ===');
