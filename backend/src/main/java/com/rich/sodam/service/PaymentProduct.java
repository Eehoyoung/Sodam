package com.rich.sodam.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 결제 상품별 콜백 경로와 mock 딥링크.
 *
 * <p>이 코드베이스에는 <b>토스 복귀 방식이 두 가지</b> 있고, 상품마다 다르다.
 * 어느 쪽인지 모르고 고치면 멀쩡한 경로를 막게 되므로 {@link CallbackStrategy} 로 명시한다.</p>
 *
 * <ul>
 *   <li><b>{@code SERVER_REDIRECT}</b>(세무서비스) — 토스가 <b>실제 서버 URL</b> 로 리다이렉트하고
 *       서버가 앱 딥링크로 302 를 돌려준다. 그래서 {@code callbackPath} 에 대응하는 컨트롤러가
 *       반드시 존재해야 한다({@code TaxServicePaymentCallbackController}). 이 URL 은
 *       readiness 응답으로 FE 에 내려가 실제로 사용된다.</li>
 *   <li><b>{@code CLIENT_INTERCEPT}</b>(출근권 충전) — WebView 가
 *       {@code https://sodam.local/...} 같은 <b>실재하지 않는 센티넬 URL</b> 로의 이동을
 *       {@code onShouldStartLoadWithRequest} 로 가로챈다. 요청이 기기 밖으로 나가지 않으므로
 *       <b>서버 엔드포인트가 필요 없다</b>. 화면이 센티넬을 자체 상수로 들고 있어
 *       ({@code AttendanceCreditChargePaymentScreen}) readiness 의 successUrl/failUrl 은
 *       <b>소비되지 않는다</b> — LIVE 여부 신호로만 쓰인다.</li>
 * </ul>
 *
 * <p>⚠️ 2026-08-13 에 이 구분을 모르고 "출근권 콜백 컨트롤러가 없으니 LIVE 가 깨진다" 고 판단해
 * LIVE 를 UNAVAILABLE 로 막은 적이 있다. 실제로는 그 상품이 서버 콜백을 쓰지 않으므로
 * 멀쩡한 경로를 막은 것이었다. 되돌렸다.</p>
 */
@Getter
@RequiredArgsConstructor
public enum PaymentProduct {

    /** 세무서비스 — 토스가 서버로 리다이렉트하고 서버가 딥링크로 돌려보낸다. */
    TAX_SERVICE(
            CallbackStrategy.SERVER_REDIRECT,
            "/api/billing/tax-orders/callback",
            "sodam://payment/tax-service/success",
            "sodam://payment/tax-service/fail"),

    /**
     * 출근권 충전 — WebView 가 센티넬 URL 을 가로챈다(서버 왕복 없음).
     *
     * <p>{@code callbackPath} 는 화면이 가로채는 센티넬 경로와 같은 문자열이지만, 서버에
     * 이 경로의 컨트롤러는 <b>없고 필요하지도 않다</b>. LIVE readiness 가 만들어 내려주는
     * URL 도 FE 에서 쓰이지 않는다.</p>
     */
    ATTENDANCE_CREDIT(
            CallbackStrategy.CLIENT_INTERCEPT,
            "/attendance-credit-charge",
            "sodam://payment/attendance-credit/success",
            "sodam://payment/attendance-credit/fail");

    public enum CallbackStrategy {
        /** 토스 → 서버 URL → 앱 딥링크. 서버 컨트롤러 필수. */
        SERVER_REDIRECT,
        /** 토스 → 센티넬 URL 을 WebView 가 가로챔. 서버 컨트롤러 불필요. */
        CLIENT_INTERCEPT
    }

    private final CallbackStrategy callbackStrategy;
    private final String callbackPath;
    private final String mockSuccessUrl;
    private final String mockFailUrl;

    /** 이 상품의 LIVE 복귀에 서버 콜백 컨트롤러가 필요한가. */
    public boolean requiresServerCallback() {
        return callbackStrategy == CallbackStrategy.SERVER_REDIRECT;
    }
}
