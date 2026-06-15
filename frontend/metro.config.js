const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Remove deprecated options from defaultConfig
if (defaultConfig.server && defaultConfig.server.forwardClientLogs !== undefined) {
    delete defaultConfig.server.forwardClientLogs;
}
if (defaultConfig.watcher) {
    delete defaultConfig.watcher.unstable_lazySha1;
    delete defaultConfig.watcher.unstable_workerThreads;
    delete defaultConfig.watcher.unstable_autoSaveCache; // Metro v0.76.9 호환성을 위해 강제 삭제
}

const customConfig = {
    resolver: {
        assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
        sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
        // Metro v0.81+ 에서는 blockList 가 RegExp 또는 RegExp[] 직접 받음
        blockList: [
            /out\/production\/.*/,
            /\.git\//,
            /node_modules\/.*\/test\//,
        ],
        unstable_enablePackageExports: false,
        // 개발 모드 해결 최적화
        platforms: ['ios', 'android', 'native', 'web'],
    },
    transformer: {
        babelTransformerPath: require.resolve('react-native-svg-transformer'),
        // 개발 모드 변환 최적화
        unstable_allowRequireContext: true,
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false, // 개발 모드에서는 비활성화
            },
        }),
    },
    server: {
        // 8081/8082 모두 다른 Docker(stockmate-ai) 점유 — 8088 로 회피
        port: 8088,
    },
    watcher: {
        healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 60000,
        },
        // 개발 성능 최적화 (Windows 환경: Watchman 미지원이므로 비활성화)
        watchman: false,
        additionalExts: ['ts', 'tsx'],
    },
};

module.exports = mergeConfig(defaultConfig, customConfig);
