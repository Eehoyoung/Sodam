package com.rich.sodam.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 결제 상품별 콜백 경로와 mock 딥링크.
 *
 * <p><b>{@code callbackPath} 는 실제로 존재하는 서버 엔드포인트여야 한다.</b> LIVE 모드의
 * readiness 응답은 이 경로로 성공/실패 URL 을 만들어 FE 에 내려주고, FE 는 그 URL 이
 * 채워졌는지를 결제 진행 가부의 한 축으로 쓴다. 경로가 없으면 URL 은 채워지는데 열면
 * 404 라, 게이트는 통과하고 결제만 깨지는 최악의 조합이 된다.</p>
 *
 * <p>그래서 LIVE 콜백이 아직 구현되지 않은 상품은 {@code callbackPath} 를 지어내지 말고
 * {@code null} 로 두어야 한다 — {@link PaymentReadinessService} 가 그 상품을 LIVE 에서
 * {@code UNAVAILABLE} 로 응답해, FE 가 "준비 중" 안내를 띄우고 멈춘다. 그게 사실이다.</p>
 */
@Getter
@RequiredArgsConstructor
public enum PaymentProduct {
    TAX_SERVICE(
            "/api/billing/tax-orders/callback",
            "sodam://payment/tax-service/success",
            "sodam://payment/tax-service/fail"),

    /**
     * 출근권 충전. mock 경로만 동작한다.
     *
     * <p>LIVE 콜백 컨트롤러가 없어 {@code callbackPath} 가 {@code null} 이다 — 실키를
     * 켜기 전에 콜백 엔드포인트를 먼저 만들고 여기에 그 경로를 적을 것(출시 게이트 H-2).</p>
     */
    ATTENDANCE_CREDIT(
            null,
            "sodam://payment/attendance-credit/success",
            "sodam://payment/attendance-credit/fail");

    private final String callbackPath;
    private final String mockSuccessUrl;
    private final String mockFailUrl;

    /** LIVE 결제 콜백이 서버에 실제로 배선돼 있는가. */
    public boolean supportsLiveCallback() {
        return callbackPath != null;
    }
}
