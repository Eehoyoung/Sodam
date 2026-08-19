import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import App from '../App';

/**
 * 앱 진입점이 크래시 없이 마운트되는지 확인하는 스모크 테스트.
 *
 * <p>App 은 GestureHandlerRootView·SafeAreaProvider·ThemeProvider·QueryClientProvider·
 * AuthProvider·ErrorBoundary 를 겹겹이 감싼다. 이 중 하나라도 프로바이더 순서가 어긋나거나
 * 초기화 훅이 던지면 앱이 흰 화면으로 뜬다(WSOD). 단위 테스트로는 잡히지 않는 종류의 회귀라
 * 여기서 전체 트리를 한 번 마운트해 본다.</p>
 *
 * <p>이전 버전은 react-test-renderer 로 마운트하고 {@code toJSON()} 의 truthy 여부만 봤는데,
 * 네비게이션·reanimated mock 이 맞지 않아 스킵돼 있었다. 지금은 프로젝트 표준 mock 이
 * jest.setup.js 에 갖춰져 있어 RTL 실렌더링으로 마운트된다.</p>
 */
/**
 * render(<App />) 는 네비게이션 트리 전체(150여 화면)를 그 자리에서 최초로 require·트랜스폼한다.
 * jest 변환 캐시가 따뜻한 로컬 재실행에서는 순식간이지만, 캐시가 비어 있는 환경(CI 의 매 실행,
 * 로컬 `--no-cache`)에서는 그 변환 시간이 테스트 본문 시간에 포함돼 기본 타임아웃 5초를 넘긴다.
 * CI frontend 잡이 이 자리에서 반복 실패했고, `--no-cache` 로 로컬 재현까지 확인했다.
 * 검증 내용(트리가 크래시 없이 마운트되는가)은 그대로 두고 시간만 넉넉히 준다.
 */
const BOOTSTRAP_TIMEOUT_MS = 60_000;

describe('App bootstrap', () => {
    it('전체 프로바이더 트리가 크래시 없이 마운트된다', async () => {
        const {toJSON} = render(<App />);

        // App 은 초기화 단계를 InteractionManager 로 미룬다 — 마운트 직후가 아니라
        // 그 단계까지 지난 뒤에도 트리가 살아 있어야 한다.
        await waitFor(() => {
            expect(toJSON()).toBeTruthy();
        });
    }, BOOTSTRAP_TIMEOUT_MS);

    it('마운트 중 콘솔 에러를 남기지 않는다', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<App />);
        await waitFor(() => {
            expect(errorSpy).not.toHaveBeenCalled();
        });

        errorSpy.mockRestore();
    }, BOOTSTRAP_TIMEOUT_MS);
});
