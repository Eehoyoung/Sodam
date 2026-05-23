/**
 * env.ts 는 import 시점에 Platform.OS / __DEV__ / process.env 를 읽어 상수를 만든다.
 * 따라서 각 케이스마다 jest.resetModules() + jest.doMock 으로 격리해야 한다.
 */

describe('env (config)', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...ORIGINAL_ENV};
        delete process.env.SODAM_API_BASE_URL;
        delete process.env.SODAM_ENV;
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    /**
     * Platform 모킹 + __DEV__ 설정 후 env 모듈을 새로 로드해서 반환.
     */
    function loadEnvWith(opts: {os: 'ios' | 'android' | 'web'; dev?: boolean}) {
        // __DEV__ 는 RN 런타임 글로벌
        (globalThis as any).__DEV__ = opts.dev ?? true;

        jest.doMock('react-native', () => ({
            Platform: {OS: opts.os, select: (o: any) => o[opts.os]},
            NativeModules: {},
        }));

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../../../src/common/config/env');
        return mod.env;
    }

    describe('apiBaseUrl 자동 분기', () => {
        it('Android + dev 면 10.0.2.2:7070', () => {
            const env = loadEnvWith({os: 'android', dev: true});
            expect(env.apiBaseUrl).toBe('http://10.0.2.2:7070');
        });

        it('iOS + dev 면 localhost:7070', () => {
            const env = loadEnvWith({os: 'ios', dev: true});
            expect(env.apiBaseUrl).toBe('http://localhost:7070');
        });

        it('web fallback 도 localhost:7070', () => {
            const env = loadEnvWith({os: 'web', dev: true});
            expect(env.apiBaseUrl).toBe('http://localhost:7070');
        });
    });

    describe('SODAM_API_BASE_URL 우선', () => {
        it('환경변수가 있으면 platform 분기를 무시하고 그 값을 사용한다', () => {
            process.env.SODAM_API_BASE_URL = 'https://custom.api.test';
            const env = loadEnvWith({os: 'android', dev: true});
            expect(env.apiBaseUrl).toBe('https://custom.api.test');
        });

        it('prod 환경에서도 환경변수가 우선한다', () => {
            process.env.SODAM_API_BASE_URL = 'https://override.api.test';
            const env = loadEnvWith({os: 'ios', dev: false});
            expect(env.apiBaseUrl).toBe('https://override.api.test');
        });
    });

    describe('env.name 분기', () => {
        it('__DEV__=true 면 dev', () => {
            const env = loadEnvWith({os: 'ios', dev: true});
            expect(env.name).toBe('dev');
        });

        it('__DEV__=false 면 prod (apiBaseUrl 도 https://sodam-api.com)', () => {
            const env = loadEnvWith({os: 'ios', dev: false});
            expect(env.name).toBe('prod');
            expect(env.apiBaseUrl).toBe('https://sodam-api.com');
        });

        it('SODAM_ENV=staging 강제 시 staging 으로 분기', () => {
            process.env.SODAM_ENV = 'staging';
            const env = loadEnvWith({os: 'ios', dev: true});
            expect(env.name).toBe('staging');
            expect(env.apiBaseUrl).toBe('https://dev-api.sodam.com');
        });
    });

    describe('기타 설정', () => {
        it('apiTimeout 은 10초 기본값', () => {
            const env = loadEnvWith({os: 'ios', dev: true});
            expect(env.apiTimeout).toBe(10000);
        });

        it('tossClientKey 는 env 가 없으면 토스 공개 테스트 키로 폴백', () => {
            const env = loadEnvWith({os: 'ios', dev: true});
            expect(env.tossClientKey).toBe('test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq');
        });
    });
});
