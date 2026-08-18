import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {GlobalOfflineBanner} from '../../../src/common/components/ds/GlobalOfflineBanner';

// [Test Mapping] C-5 — useOfflineSync 가 실제 NetInfo 이벤트를 구독한다.
// 예전 구현은 isConnected: true 를 하드코딩해, 기기가 오프라인이어도 배너가 절대 뜨지 않았다.

const listeners = () => (globalThis as any).__netInfoListeners as Array<(s: any) => void>;

const renderBanner = () => {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
        renderer = ReactTestRenderer.create(
            <QueryClientProvider client={client}>
                <GlobalOfflineBanner />
            </QueryClientProvider>,
        );
    });
    return renderer;
};

describe('useOfflineSync 네트워크 감지', () => {
    beforeEach(() => {
        listeners().length = 0;
    });

    it('온라인일 때는 배너를 표시하지 않는다', () => {
        const renderer = renderBanner();
        expect(renderer.toJSON()).toBeNull();
    });

    it('NetInfo 가 오프라인을 알리면 배너가 나타난다', () => {
        const renderer = renderBanner();
        expect(listeners().length).toBeGreaterThan(0);

        act(() => {
            listeners().forEach(cb => cb({isConnected: false, type: 'none', isInternetReachable: false}));
        });

        expect(renderer.toJSON()).not.toBeNull();
    });
});
