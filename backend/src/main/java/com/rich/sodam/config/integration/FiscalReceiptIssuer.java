package com.rich.sodam.config.integration;

import com.rich.sodam.domain.PaymentReceipt;

/** 세금계산서/현금영수증 발급 대행사 어댑터. 세무사·대행사 계약 확정 전에도 mock/live 배선은 유지한다. */
public interface FiscalReceiptIssuer {
    record Result(String reference) {}
    Result issue(PaymentReceipt receipt);
}
