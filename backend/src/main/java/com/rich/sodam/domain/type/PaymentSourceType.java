package com.rich.sodam.domain.type;

/**
 * 과금 원본 주문의 종류. 주문 테이블은 도메인별로 분리돼 있지만, 환불·증빙은 이 공통 식별자로
 * 추적한다. 새 과금 상품을 추가할 때 이 enum과 PaymentSettlementService의 해석기를 함께 추가한다.
 */
public enum PaymentSourceType {
    SUBSCRIPTION,
    ATTENDANCE_CREDIT_CHARGE,
    RECRUITMENT_BOOST_PASS,
    TAX_SERVICE
}
