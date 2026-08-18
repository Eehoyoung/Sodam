// Jest setup file for mocking React Native modules

// Mock AsyncStorage - conditional mock to avoid requiring the package
try {
    jest.mock('@react-native-async-storage/async-storage', () => ({
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn(() => Promise.resolve()),
        removeItem: jest.fn(() => Promise.resolve()),
    }));
} catch (e) {
    // Package not installed, skip mock
}

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
    NavigationContainer: ({children}) => children,
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
    }),
    // navigationRef.ts 가 모듈 로드 시점에 호출 → 미정의면 import 단계에서 크래시.
    createNavigationContainerRef: () => ({
        isReady: () => false,
        navigate: jest.fn(),
        reset: jest.fn(),
        goBack: jest.fn(),
        getRootState: jest.fn(),
        current: null,
    }),
    useFocusEffect: jest.fn(),
    useRoute: () => ({params: {}}),
}));


// Mock React Native modules
jest.mock('react-native', () => ({
    StatusBar: 'StatusBar',
    useColorScheme: jest.fn(() => 'light'),
    StyleSheet: {
        create: jest.fn((styles) => styles),
        flatten: jest.fn((style) => {
            if (Array.isArray(style)) {
                return Object.assign({}, ...style.map((s) => s || {}));
            }
            return style || {};
        }),
        compose: jest.fn((a, b) => [a, b]),
        absoluteFillObject: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0},
        hairlineWidth: 1,
    },
    View: 'View',
    Text: 'Text',
    Button: 'Button',
    TouchableOpacity: 'TouchableOpacity',
    Image: 'Image',
    ScrollView: 'ScrollView',
    Animated: {
        Value: jest.fn(() => ({
            setValue: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            removeAllListeners: jest.fn(),
            interpolate: jest.fn(() => ({
                setValue: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn(),
            })),
        })),
        View: 'Animated.View',
        ScrollView: 'Animated.ScrollView',
        Text: 'Animated.Text',
        timing: jest.fn(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        spring: jest.fn(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        decay: jest.fn(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        sequence: jest.fn(() => ({
            start: jest.fn((cb) => cb && cb({finished: true})),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        parallel: jest.fn(() => ({
            start: jest.fn((cb) => cb && cb({finished: true})),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        stagger: jest.fn(() => ({
            start: jest.fn((cb) => cb && cb({finished: true})),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        loop: jest.fn(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        delay: jest.fn(() => ({
            start: jest.fn((cb) => cb && cb({finished: true})),
            stop: jest.fn(),
            reset: jest.fn(),
        })),
        event: jest.fn(() => jest.fn()),
        createAnimatedComponent: jest.fn(() => 'AnimatedComponent'),
        add: jest.fn(),
        subtract: jest.fn(),
        multiply: jest.fn(),
        divide: jest.fn(),
        modulo: jest.fn(),
        diffClamp: jest.fn(),
    },
    InteractionManager: {
        runAfterInteractions: jest.fn((cb) => {
            if (typeof cb === 'function') {
                cb();
            }
            return { cancel: jest.fn() };
        }),
    },
    Dimensions: {
        get: jest.fn(() => ({width: 375, height: 812})),
    },
    // useResponsive() 등 여러 DS 컴포넌트(HeroNumber 포함)가 사용 — 누락 시 렌더 중 크래시.
    useWindowDimensions: jest.fn(() => ({width: 375, height: 812})),
    Platform: {
        OS: 'ios',
        select: jest.fn((obj) => obj.ios),
    },
    LogBox: {
        ignoreLogs: jest.fn(),
        ignoreAllLogs: jest.fn(),
    },
    Alert: {
        alert: jest.fn(),
        prompt: jest.fn(),
    },
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    RefreshControl: 'RefreshControl',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Modal: 'Modal',
    Switch: 'Switch',
    TextInput: 'TextInput',
    Linking: {
        openURL: jest.fn(() => Promise.resolve()),
        canOpenURL: jest.fn(() => Promise.resolve(true)),
        addEventListener: jest.fn(() => ({remove: jest.fn()})),
        removeEventListener: jest.fn(),
        getInitialURL: jest.fn(() => Promise.resolve(null)),
    },
    AppState: {
        currentState: 'active',
        addEventListener: jest.fn(() => ({remove: jest.fn()})),
        removeEventListener: jest.fn(),
    },
    // ThemeProvider 가 시스템 다크모드를 읽는다. 이게 없으면 App 전체 마운트가
    // getColorScheme 에서 터지고 ErrorBoundary 가 삼켜, 테스트는 통과하는데 실제로는
    // 에러 화면이 렌더된 상태가 된다(app.bootstrap 이 오래 스킵돼 있던 이유).
    Appearance: {
        getColorScheme: jest.fn(() => 'light'),
        addChangeListener: jest.fn(() => ({remove: jest.fn()})),
    },
    NativeModules: {},
    PixelRatio: {get: jest.fn(() => 2), getFontScale: jest.fn(() => 1)},
    PermissionsAndroid: {
        PERMISSIONS: {POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS'},
        RESULTS: {GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again'},
        request: jest.fn(() => Promise.resolve('granted')),
        check: jest.fn(() => Promise.resolve(true)),
    },
}));

// Mock react-native-linear-gradient (LinearGradient used across screens)
jest.mock('react-native-linear-gradient', () => ({__esModule: true, default: 'LinearGradient'}));

// @react-native-community/datetimepicker uses ESM exports
jest.mock('@react-native-community/datetimepicker', () => ({__esModule: true, default: 'DateTimePicker'}));

// WebSocket 스텁 — 화면 테스트가 STOMP 실시간 동기화(storeSyncClient)를 마운트하면
// new WebSocket(...) 이 호출된다. Node 22 에는 전역 WebSocket 이 있어 "진짜 소켓"을 열려다
// 조용히 실패하고, Node 20(CI)에는 아예 없어 ReferenceError 로 스위트가 죽었다.
// RN 런타임이 제공하는 전역이므로 테스트에서는 아무것도 하지 않는 스텁으로 고정한다 —
// Node 버전과 무관하게 결정적이고, 단위 테스트가 네트워크를 건드리지 않는다.
class MockWebSocket {
    constructor(url, protocols) {
        this.url = url;
        this.protocols = protocols;
        this.readyState = 0; // CONNECTING 상태로 머문다(연결/실패 콜백 없음)
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;
globalThis.WebSocket = MockWebSocket;

// react-native-blob-util — 법적 문서 PDF 저장/열기(H-4). 실제 파일 IO 없이 호출만 검증한다.
jest.mock('react-native-blob-util', () => {
    const fetchMock = jest.fn(() => Promise.resolve({
        info: () => ({status: 200}),
        path: () => '/mock/documents/file.pdf',
    }));
    const api = {
        config: jest.fn(() => ({fetch: fetchMock})),
        fs: {dirs: {DocumentDir: '/mock/documents', CacheDir: '/mock/cache'}},
        android: {actionViewIntent: jest.fn(() => Promise.resolve())},
        ios: {openDocument: jest.fn(() => Promise.resolve())},
    };
    globalThis.__blobUtilFetch = fetchMock;
    return {__esModule: true, default: api, ...api};
});

// @react-native-community/netinfo — 테스트에서 네트워크 상태를 직접 밀어 넣을 수 있게 리스너를 보관한다.
// (globalThis.__netInfoListeners 로 노출: 오프라인 전환 시나리오 테스트가 이 배열을 호출한다)
jest.mock('@react-native-community/netinfo', () => {
    const listeners = [];
    globalThis.__netInfoListeners = listeners;
    return {
        __esModule: true,
        default: {
            addEventListener: jest.fn((cb) => {
                listeners.push(cb);
                cb({isConnected: true, type: 'wifi', isInternetReachable: true});
                return () => {
                    const i = listeners.indexOf(cb);
                    if (i >= 0) { listeners.splice(i, 1); }
                };
            }),
            fetch: jest.fn(() => Promise.resolve({isConnected: true, type: 'wifi', isInternetReachable: true})),
        },
    };
});

// Native modules typically not parseable as ESM in test env
jest.mock('react-native-geolocation-service', () => ({
    __esModule: true,
    default: {
        getCurrentPosition: jest.fn((onSuccess) => onSuccess({coords: {latitude: 37.5, longitude: 127, accuracy: 5}})),
        watchPosition: jest.fn(),
        clearWatch: jest.fn(),
        stopObserving: jest.fn(),
        requestAuthorization: jest.fn(() => Promise.resolve('granted')),
    },
}));
jest.mock('react-native-permissions', () => ({
    PERMISSIONS: {
        ANDROID: {ACCESS_FINE_LOCATION: 'android.fine', NFC: 'android.nfc'},
        IOS: {LOCATION_WHEN_IN_USE: 'ios.location.wheninuse'},
    },
    RESULTS: {GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked', UNAVAILABLE: 'unavailable'},
    request: jest.fn(() => Promise.resolve('granted')),
    check: jest.fn(() => Promise.resolve('granted')),
    openSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-nfc-manager', () => ({
    __esModule: true,
    default: {
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        // 실제 API 는 Promise 를 반환한다. undefined 를 돌려주면 화면 정리(cleanup) 이펙트의
        // .catch() 가 TypeError 로 터진다 — 언마운트하는 테스트에서만 드러나던 목 누락.
        requestTechnology: jest.fn(() => Promise.resolve()),
        cancelTechnologyRequest: jest.fn(() => Promise.resolve()),
        getTag: jest.fn(() => Promise.resolve(null)),
        isSupported: jest.fn(() => Promise.resolve(true)),
        isEnabled: jest.fn(() => Promise.resolve(true)),
        setEventListener: jest.fn(),
    },
    NfcTech: {Ndef: 'Ndef', NfcA: 'NfcA'},
    NfcEvents: {DiscoverTag: 'DiscoverTag'},
}));
// react-native-vision-camera (WP-C QR 스캐너) — 실기 카메라 없이 permission granted + mock device로
// QRScannerModal이 정상 렌더되게 한다. useCodeScanner는 라이브러리 실구현처럼 옵션 객체를 그대로 반환.
jest.mock('react-native-vision-camera', () => ({
    __esModule: true,
    Camera: 'Camera',
    useCameraDevice: jest.fn(() => ({id: 'mock-back-camera', position: 'back'})),
    useCameraPermission: jest.fn(() => ({
        hasPermission: true,
        requestPermission: jest.fn(() => Promise.resolve(true)),
    })),
    useCodeScanner: jest.fn((options) => options),
}));

// react-native-qrcode-svg (WP-C 사장용 QR 표시) — react-native-svg 위에 그려지는 순수 JS 컴포넌트.
jest.mock('react-native-qrcode-svg', () => ({
    __esModule: true,
    default: 'QRCode',
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
    appleAuth: {
        performRequest: jest.fn(() => Promise.resolve({identityToken: 'mock-identity-token'})),
        Operation: {LOGIN: 'LOGIN'},
        Scope: {EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME'},
    },
    AppleButton: 'AppleButton',
}));

// Mock @react-native-firebase/messaging + /app (FCM key-ready 래퍼는 optional-require 로
// 이미 부재를 막지만, 모듈이 설치된 환경에서 깔끔히 동작하도록 명시 mock).
// src/common/services/fcm.ts 는 RNFirebase v22+ 모듈러 API(getMessaging/getToken/...)를
// 우선 사용한다 — 네임스페이스 API(default 팩토리)는 deprecated 폴백일 뿐이므로, 여기서도
// 모듈러 API 모양으로 mock 해야 실제로 검증하는 코드 경로와 일치한다.
try {
    jest.mock('@react-native-firebase/messaging', () => ({
        __esModule: true,
        getMessaging: jest.fn(() => ({})),
        getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
        requestPermission: jest.fn(() => Promise.resolve(1)),
        onMessage: jest.fn(() => jest.fn()),
        onTokenRefresh: jest.fn(() => jest.fn()),
    }), {virtual: true}); // 패키지 미설치 상태에서도 mock 등록 (key-ready 검증용)
    jest.mock('@react-native-firebase/app', () => ({
        __esModule: true,
        getApp: jest.fn(() => ({})),
    }), {virtual: true});
} catch (e) {
    // 모듈 미설치 — optional-require 가 fallback 처리
}

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
    enableScreens: jest.fn(),
}));

// Mock react-native-safe-area-context.
// SafeAreaView forwards remaining props (testID, style, ...) onto a host 'View' so that
// screens relying on testID for RNTL queries (getByTestId) still resolve under real rendering —
// a bare `({children}) => children` passthrough silently drops testID/style.
jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    return {
        SafeAreaProvider: ({children}) => children,
        SafeAreaView: ({children, ...props}) => React.createElement('View', props, children),
        useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
    };
});

// Mock react-native-webview (AddressSearchModal — 카카오 주소검색 postcode iframe)
jest.mock('react-native-webview', () => ({
    WebView: 'WebView',
}));

// RNGH is mapped via moduleNameMapper to a lightweight stub in tests/mocks/react-native-gesture-handler.js

// @expo/vector-icons removed — migrated to react-native-vector-icons
// Mock react-native-vector-icons icon sets
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesome');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'FontAwesome5');

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
    __esModule: true,
    Svg: 'Svg',
    Circle: 'Circle',
    Ellipse: 'Ellipse',
    G: 'G',
    Text: 'Text',
    TSpan: 'TSpan',
    TextPath: 'TextPath',
    Path: 'Path',
    Polygon: 'Polygon',
    Polyline: 'Polyline',
    Line: 'Line',
    Rect: 'Rect',
    Use: 'Use',
    Image: 'Image',
    Symbol: 'Symbol',
    Defs: 'Defs',
    LinearGradient: 'LinearGradient',
    RadialGradient: 'RadialGradient',
    Stop: 'Stop',
    ClipPath: 'ClipPath',
    Pattern: 'Pattern',
    Mask: 'Mask',
    Filter: 'Filter',
    FeDropShadow: 'FeDropShadow',
    FeGaussianBlur: 'FeGaussianBlur',
    FeColorMatrix: 'FeColorMatrix',
    FeOffset: 'FeOffset',
    FeMerge: 'FeMerge',
    FeMergeNode: 'FeMergeNode',
    FeFlood: 'FeFlood',
    FeComposite: 'FeComposite',
    ForeignObject: 'ForeignObject',
    default: 'Svg',
}));

// Mock react-native-reanimated with official mock to avoid native crashes in Jest.
// jest.mock's factory is lazy — it only runs the first time a test actually requires the
// module, so a try/catch wrapped around the jest.mock(...) call itself never sees an error
// thrown from inside the factory. The try/catch must be INSIDE the factory to fall back
// correctly when the official mock's own require chain breaks (e.g. reanimated 4.x mock
// incompatibility).
jest.mock('react-native-reanimated', () => {
    try {
        return require('react-native-reanimated/mock');
    } catch (e) {
        // module resolution failed — minimal fallback
        return {
            Easing: {linear: jest.fn(), ease: jest.fn()},
            useSharedValue: jest.fn(() => ({value: 0})),
            useAnimatedStyle: jest.fn(() => ({})),
            withTiming: jest.fn((v) => v),
            withSpring: jest.fn((v) => v),
            withDelay: jest.fn((_, v) => v),
            runOnJS: (fn) => fn,
            runOnUI: (fn) => fn,
            createAnimatedComponent: (c) => c,
        };
    }
});

// NOTE: @testing-library/react-native is intentionally NOT mocked here — it is a real dev
// dependency (see package.json) and screens must be rendered through the genuine RNTL renderer.
// A previous lightweight stub (fake render()/findByText() that always resolved truthy) hid real
// runtime failures from Jest entirely (e.g. AddressSearchModal's react-native-webview link crash
// shipped to a device despite 337 "passing" FE tests). Removed 2026-07-12.

// Mock @react-navigation/native-stack to avoid native dependencies in tests.
// Renders only the resolved initial route's `component` (matching real single-screen-focus
// stack behavior) instead of dumping every <Stack.Screen> child — a naive `children` passthrough
// mock never invokes the `component` prop (the pattern used by every screen in this codebase),
// so real RNTL queries against a rendered <Stack.Navigator> would find nothing.
try {
  jest.mock('@react-navigation/native-stack', () => {
    const React = require('react');
    const Navigator = ({children, initialRouteName}) => {
      const screens = React.Children.toArray(children).filter(Boolean);
      const target =
        (initialRouteName && screens.find((s) => s.props && s.props.name === initialRouteName)) ||
        screens[0];
      if (!target) {
        return null;
      }
      const {component: ScreenComponent, children: renderChildren, initialParams, name} = target.props;
      const navigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        setOptions: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
        removeListener: jest.fn(),
        isFocused: jest.fn(() => true),
      };
      const route = {name, params: initialParams, key: `${name}-mock`};
      if (typeof renderChildren === 'function') {
        return renderChildren({navigation, route});
      }
      if (ScreenComponent) {
        return React.createElement(ScreenComponent, {navigation, route});
      }
      return null;
    };
    const Screen = () => null;
    const createNativeStackNavigator = () => ({Navigator, Screen});
    return { createNativeStackNavigator };
  });
} catch (e) {
  // ignore
}

// Optional: mock elements to bypass masked view
try {
  jest.mock('@react-navigation/elements', () => ({
    HeaderBackButton: ({children}) => children || null,
  }));
} catch (e) {
  // ignore
}
