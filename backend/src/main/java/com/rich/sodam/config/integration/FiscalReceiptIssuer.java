package com.rich.sodam.config.integration;

import com.rich.sodam.domain.PaymentReceipt;

/** 세금계산서/현금영수증 발급 대행사 어댑터. 세무사·대행사 계약 확정 전에도 mock/live 배선은 유지한다. */
public interface FiscalReceiptIssuer {
    record Result(String reference) {}

    Result issue(PaymentReceipt receipt);

    /**
     * 발급된 증빙의 취소·감액 통지(부가가치세법 시행령 §70 수정세금계산서).
     *
     * <p>환불이 일어나면 내부 상태만 CANCELLED 로 바꾸는 것으로는 부족하다 — 이미 발급된 건은
     * 수정세금계산서를 발급해야 한다(G-11 선결 2). 발급 대상이 {@code NONE} 인 동안에는
     * 애초에 발급된 건이 없으므로 이 경로가 타지 않는다.</p>
     *
     * @param receipt                    원본 증빙
     * @param remainingTaxableAmountKrw  수정 후 남는 과세표준. 전액 환불이면 0
     * @param reason                     취소·감액 사유
     */
    Result amend(PaymentReceipt receipt, int remainingTaxableAmountKrw, String reason);
}
