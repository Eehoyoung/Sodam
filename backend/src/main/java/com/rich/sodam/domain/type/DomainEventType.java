package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 퍼널 계측 이벤트 종류 (A6). 마스터 §2.1-5 "도메인 이벤트 로깅 적재(분석)" 이행.
 *
 * <p>activation·리텐션·전환 퍼널의 분기점을 append-only 로 적재해 이후 A/B·전환율 측정의
 * 분모를 확보한다. 결제 로직과 무관한 분석 신호일 뿐이다.
 */
@Getter
public enum DomainEventType {
    STORE_CREATED("매장 생성"),
    PAYROLL_PREVIEW_VIEWED("급여 미리보기"),
    PURCHASE_SAVED("매입 기록"),
    EMPLOYEE_REGISTERED("직원 등록"),
    FIRST_CHECK_IN("첫 출근"),
    PAYSLIP_ISSUED("명세서 발급"),
    SUBSCRIPTION_STARTED("구독 시작");

    private final String label;

    DomainEventType(String label) {
        this.label = label;
    }
}
