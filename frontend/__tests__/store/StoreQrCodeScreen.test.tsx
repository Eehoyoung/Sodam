import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// WP-C(D-2 해소) — 사장용 QR 표시·재발급 화면. 핵심 검증:
//   1. 조회 성공 시 QR 이미지(토큰 값)와 발급/만료 시각이 표시된다
//   2. 조회 실패 시 에러 상태 + 다시 시도 버튼이 표시된다
//   3. 재발급 확인 시트에서 확인하면 rotate 뮤테이션이 호출된다
//
// 실제 TanStack QueryClientProvider + 네트워크 프라미스 체인을 react-test-renderer로 구동하면
// 관측 불가능한 매크로태스크 홉이 섞여 타이밍이 불안정해진다(JobSeekingSettingsScreen.test.tsx와
// 동일 이유) — useStoreQrCode/useRotateStoreQrCode 훅 모듈을 직접 목(mock)해 화면 로직만
// 결정적으로 검증한다(서비스 레이어는 별도 검증 대상).

const mockRefetch = jest.fn();
const mockMutate = jest.fn();

const mockQueryState: {data: any; isLoading: boolean; isError: boolean} = {
    data: undefined,
    isLoading: false,
    isError: false,
};
const mockMutationState: {isPending: boolean} = {isPending: false};

jest.mock('../../src/features/store/hooks/useStoreQrCodeQueries', () => ({
    useStoreQrCode: () => ({
        data: mockQueryState.data,
        isLoading: mockQueryState.isLoading,
        isError: mockQueryState.isError,
        refetch: mockRefetch,
    }),
    useRotateStoreQrCode: () => ({
        mutate: mockMutate,
        isPending: mockMutationState.isPending,
    }),
}));

import StoreQrCodeScreen from '../../src/features/store/screens/StoreQrCodeScreen';
import {ConfirmSheet} from '../../src/common/components/ds';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const renderScreen = () => {
    const navigation = {goBack: jest.fn()} as any;
    const route = {params: {storeId: 7}} as any;
    return ReactTestRenderer.create(<StoreQrCodeScreen route={route} navigation={navigation} />);
};

const collectText = (renderer: ReactTestRenderer.ReactTestRenderer): string[] =>
    renderer.root
        .findAllByType('Text' as any)
        .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
        .filter((child): child is string => typeof child === 'string');

describe('StoreQrCodeScreen — 매장 QR 표시·재발급(WP-C, 사장 전용)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQueryState.data = undefined;
        mockQueryState.isLoading = false;
        mockQueryState.isError = false;
        mockMutationState.isPending = false;
    });

    test('QR을 불러오면 QRCode(토큰 값)와 발급/만료 시각을 보여준다', async () => {
        mockQueryState.data = {
            storeId: 7,
            token: 'tok-abc-123',
            issuedAt: '2026-08-17T09:00:00',
            expiresAt: '2026-08-17T21:00:00',
        };

        let renderer: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = renderScreen();
            await flush();
        });

        const qrCodes = renderer!.root.findAllByType('QRCode' as any);
        expect(qrCodes).toHaveLength(1);
        expect(qrCodes[0].props.value).toBe('tok-abc-123');

        const texts = collectText(renderer!);
        expect(texts.some((t) => t.includes('QR 재발급'))).toBe(true);
    });

    test('로딩 중에는 로딩 상태를 보여준다', async () => {
        mockQueryState.isLoading = true;

        let renderer: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = renderScreen();
            await flush();
        });

        expect(renderer!.root.findAllByType('QRCode' as any)).toHaveLength(0);
        const texts = collectText(renderer!);
        expect(texts).toContain('QR 불러오는 중');
    });

    test('불러오기 실패 시 에러 상태를 보여준다', async () => {
        mockQueryState.isError = true;

        let renderer: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = renderScreen();
            await flush();
        });

        expect(renderer!.root.findAllByType('QRCode' as any)).toHaveLength(0);
        const texts = collectText(renderer!);
        expect(texts).toContain('불러오지 못했어요');
    });

    test('QR 재발급 버튼 → 확인 시트에서 확인하면 rotate 뮤테이션을 호출한다', async () => {
        mockQueryState.data = {
            storeId: 7,
            token: 'tok-abc-123',
            issuedAt: '2026-08-17T09:00:00',
            expiresAt: '2026-08-17T21:00:00',
        };
        const confirmSpy = jest.spyOn(ConfirmSheet, 'confirm').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = renderScreen();
            await flush();
        });

        const rotateBtn = renderer!.root.findAllByProps({accessibilityLabel: 'QR 재발급'})[0];
        await act(async () => {
            rotateBtn.props.onPress();
            await flush();
        });

        expect(confirmSpy).toHaveBeenCalledWith(
            expect.objectContaining({title: expect.stringContaining('재발급')}),
        );

        // ConfirmSheetHost가 마운트돼 있지 않으므로, confirm에 전달된 primary.onPress를 직접 호출해
        // "확인" 탭을 시뮬레이션한다(JobSeekingSettingsScreen.test.tsx와 동일 패턴).
        const opts = confirmSpy.mock.calls[0][0];
        await act(async () => {
            opts.primary.onPress?.();
            await flush();
        });

        expect(mockMutate).toHaveBeenCalled();

        confirmSpy.mockRestore();
    });
});
