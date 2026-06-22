package com.rich.sodam.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * 기본 OCR 클라이언트 — 빈 초안만 반환(외부 호출 없음, 비용 0).
 *
 * <p>영수증 자동인식(실 OCR)은 외부 API 계약·키·월비용이 필요해 인간 승인 대상이다.
 * 승인·키 설정 후 실제 구현 빈을 등록하면 {@link ConditionalOnMissingBean} 으로 이 빈은
 * 비활성화된다. 그 전까지 매입장부는 <b>수기 입력</b>으로 완전히 동작한다.
 */
@Slf4j
@Component
@ConditionalOnMissingBean(name = "receiptOcrProvider")
public class NoopReceiptOcrClient implements ReceiptOcrClient {

    @Override
    public ReceiptDraft parse(byte[] image, String contentType) {
        log.debug("OCR 미설정(Noop) — 빈 초안 반환. 수기 입력 경로로 진행. contentType={}", contentType);
        return ReceiptDraft.empty();
    }
}
