package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborRiskResponse.Item;

/**
 * 노무 리스크 항목의 서술(narration) 계층 — {@code ReceiptOcrClient}/{@code NoopReceiptOcrClient}
 * 패턴을 그대로 따른다.
 *
 * <p>판정(RiskType·Severity·수치)은 규칙 엔진({@link LaborRiskService})이 이미 확정한 뒤이며,
 * 이 인터페이스는 그 위에 "표현"만 담당한다. 구현체가 숫자·리스크유형·심각도를 바꾸면 버그다(HC-8).
 * 기본 구현은 {@link TemplateLaborRiskNarrator}로, 외부 호출 없이 규칙 엔진의 문구를 그대로 반환한다.
 */
public interface LaborRiskNarrator {

    /**
     * item.message()를 기반으로 최종 노출 문구를 만든다.
     * 어떤 이유로든 실패해도 예외를 던지지 않고 원본 문구를 반환해야 한다(fail-safe).
     */
    String narrate(Item item);
}
