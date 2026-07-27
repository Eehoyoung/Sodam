import type {StorybookConfig} from '@storybook/react-native-web-vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 화면(screens) 스토리는 거의 전부 useAuth()를 거치는데, 실제 AuthContext.tsx가
 * 모듈 최상단에서 정적 import 하는 것들 중 일부는 순수 네이티브 전용이라 react-native-web
 * 번들에 대응 파일이 없다(웹 변형 없음, requireNativeComponent 등 네이티브 브릿지 직접 사용).
 * 화면 코드를 건드리지 않고, Storybook 빌드에서만 이런 모듈을 목업으로 alias 한다.
 *
 * - @react-native-firebase/*: fcm.ts가 이미 try/catch + 함수 존재 여부로 no-op 폴백하므로
 *   목업이 빈 객체여도 런타임 동작에 영향 없음.
 * - react-native-linear-gradient: PaywallHost(AuthContext.tsx가 항상 정적 import)가 사용.
 *   실제 그라디언트 대신 단색 View로 대체(자세한 내용은 mocks/linearGradientMock.tsx 참고).
 *
 * 새 화면 스토리를 추가하다 "존재하지 않는 export" 류의 빌드 에러가 나면, 대부분 이런
 * 네이티브 전용 모듈을 새로 발견한 것 — 여기 배열에 추가하면 된다.
 */
const NATIVE_ONLY_ALIASES: Array<{find: string; replacement: string}> = [
    {find: '@react-native-firebase/app', replacement: path.resolve(__dirname, './mocks/emptyNativeModule.ts')},
    {find: '@react-native-firebase/messaging', replacement: path.resolve(__dirname, './mocks/emptyNativeModule.ts')},
    {find: 'react-native-linear-gradient', replacement: path.resolve(__dirname, './mocks/linearGradientMock.tsx')},
];

const config: StorybookConfig = {
    stories: [
        '../src/**/*.mdx',
        '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    ],
    addons: [
        '@chromatic-com/storybook',
        '@storybook/addon-vitest',
        '@storybook/addon-a11y',
        '@storybook/addon-docs',
    ],
    framework: '@storybook/react-native-web-vite',
    async viteFinal(viteConfig) {
        viteConfig.resolve = viteConfig.resolve ?? {};
        const existingAlias = viteConfig.resolve.alias;

        if (Array.isArray(existingAlias)) {
            viteConfig.resolve.alias = [...existingAlias, ...NATIVE_ONLY_ALIASES];
        } else {
            viteConfig.resolve.alias = {
                ...(existingAlias ?? {}),
                ...Object.fromEntries(NATIVE_ONLY_ALIASES.map(({find, replacement}) => [find, replacement])),
            };
        }
        return viteConfig;
    },
};
export default config;
