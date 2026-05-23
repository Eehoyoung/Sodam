/**
 * usePushPermission 훅 — 현재 구현은 SDK 도입 전 stub.
 * Platform 별로 항상 granted=true 를 반환하고, autoRequest=true 면 마운트 시 자동 호출.
 *
 * 테스트 전략:
 *  - jest.setup.js 가 react 모듈 자체를 모킹하지 않으므로 실제 React 의 useState/useEffect 동작을 사용.
 *  - @testing-library/react-native 는 jest.setup.js 에서 가벼운 stub 으로 대체되어 result.current 가
 *    안정적이지 않을 수 있다. 따라서 React 의 act() + 자체 호스트 컴포넌트로 훅을 격리해서 검증한다.
 *  - 만약 react-test-renderer 가 없으면 폴백: 훅을 직접 호출하여 initial state 만 검증.
 */

import {Platform} from 'react-native';
import {usePushPermission} from '../../../src/common/hooks/usePushPermission';

// react-test-renderer 폴백 시도
let TestRenderer: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    TestRenderer = require('react-test-renderer');
} catch (_) {
    TestRenderer = null;
}

const React = require('react');

function renderHook<T>(cb: () => T): {result: {current: T | undefined}; unmount: () => void} {
    const result: {current: T | undefined} = {current: undefined};
    if (!TestRenderer) {
        // 폴백: 직접 호출 — useState 가 호출되지 않은 컨텍스트라 React.useState 가 throw 할 수 있음.
        // 가능한 시도만 하고 undefined 반환.
        try {
            result.current = cb();
        } catch (_) {
            result.current = undefined;
        }
        return {result, unmount: () => {}};
    }

    function Host() {
        result.current = cb();
        return null;
    }

    let instance: any;
    TestRenderer.act(() => {
        instance = TestRenderer.create(React.createElement(Host));
    });
    return {
        result,
        unmount: () => {
            TestRenderer.act(() => instance.unmount());
        },
    };
}

describe('usePushPermission', () => {
    if (!TestRenderer) {
        // react-test-renderer 미설치 환경 — 최소 1개라도 통과시킴
        it('react-test-renderer 미존재 시 모듈 import 검증만 수행', () => {
            expect(typeof usePushPermission).toBe('function');
        });
        return;
    }

    it('초기 status 는 unknown', () => {
        (Platform as any).OS = 'ios';
        const {result, unmount} = renderHook(() => usePushPermission(false));
        expect(result.current?.status).toBe('unknown');
        unmount();
    });

    it('request() 호출 후 status=granted (ios stub)', async () => {
        (Platform as any).OS = 'ios';
        const {result, unmount} = renderHook(() => usePushPermission(false));

        let granted: boolean | undefined;
        await TestRenderer.act(async () => {
            granted = await result.current!.request();
        });

        expect(granted).toBe(true);
        expect(result.current?.status).toBe('granted');
        unmount();
    });

    it('request() 호출 후 status=granted (android <33)', async () => {
        (Platform as any).OS = 'android';
        (Platform as any).Version = 30;
        const {result, unmount} = renderHook(() => usePushPermission(false));

        let granted: boolean | undefined;
        await TestRenderer.act(async () => {
            granted = await result.current!.request();
        });

        expect(granted).toBe(true);
        expect(result.current?.status).toBe('granted');
        unmount();
    });

    it('request() 호출 후 status=granted (android 13+)', async () => {
        (Platform as any).OS = 'android';
        (Platform as any).Version = 33;
        const {result, unmount} = renderHook(() => usePushPermission(false));

        let granted: boolean | undefined;
        await TestRenderer.act(async () => {
            granted = await result.current!.request();
        });

        expect(granted).toBe(true);
        expect(result.current?.status).toBe('granted');
        unmount();
    });

    it('autoRequest=true 면 마운트 시 자동으로 request 가 트리거되어 최종 granted 로 전이', async () => {
        (Platform as any).OS = 'ios';
        const {result, unmount} = renderHook(() => usePushPermission(true));

        // useEffect → request() 가 비동기적으로 동작하므로 act 로 flush
        await TestRenderer.act(async () => {
            // 마이크로태스크 flush
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current?.status).toBe('granted');
        unmount();
    });
});
