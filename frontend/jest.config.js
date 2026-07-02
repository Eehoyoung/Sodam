module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[tj]s?(x)'
    ],
    testPathIgnorePatterns: [
        '<rootDir>/out/',
        '<rootDir>/android/',
        '<rootDir>/ios/',
        '<rootDir>/node_modules/',
        '<rootDir>/src/utils/animations/__tests__/',
    ],
    // 커버리지 수집 대상을 현재 테스트가 존재하는 서비스 파일로 한정 (Phase 0~2)
    // [Coverage Mapping] Explicit list to avoid penalizing untested modules while Phase 3 progresses
    collectCoverageFrom: [
        'src/features/qna/services/qnaService.ts',
        'src/features/myPage/services/timeOffService.ts',
        'src/features/myPage/services/masterService.ts',
        'src/features/auth/services/userService.ts',
        'src/features/wage/services/wageService.ts',
        'src/features/salary/services/payrollService.ts',
        '!src/**/*.d.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 70, // 개발 단계에서는 낮춤
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
        '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^react-native-gesture-handler$': '<rootDir>/tests/mocks/react-native-gesture-handler.js',
        '^\\./src/contexts/AuthContext$': '<rootDir>/src/tests/mocks/AuthContext.mock.ts'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|@react-native-community|react-native-vector-icons|react-native-chart-kit|react-native-reanimated|react-native-nfc-manager|react-native-linear-gradient|react-native-svg|react-native-geolocation-service|react-native-permissions|react-native-gesture-handler|@react-navigation)/)'
    ],
    testEnvironment: 'node',
    verbose: false, // 개발 중에는 간소화
    // 성능 최적화
    maxWorkers: '50%',
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
    // 개발 편의성 (watchPlugins는 패키지 설치 후 활성화)
    // watchPlugins: [
    //     'jest-watch-typeahead/filename',
    //     'jest-watch-typeahead/testname',
    // ],
};
