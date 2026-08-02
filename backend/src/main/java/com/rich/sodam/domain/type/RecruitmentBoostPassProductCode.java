package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 채용 부스트 무제한 패스 상품 코드(recruitment-monetization-gamification-plan.md §2.5).
 *
 * <p>기간(일수)·가격은 여기(코드)에 두지 않는다 — {@code AttendanceCreditChargePackCode}와 동일한
 * 원칙으로, 최종 가격이 미확정(계획서 §10)이라 전부 {@code RecruitmentBoostPassProperties}(운영 중
 * 조정 가능한 설정값)에서 가져온다. 이 enum은 상품의 "정체성"(코드·표시명)만 갖는다.</p>
 */
@Getter
public enum RecruitmentBoostPassProductCode {

    /** 3일권 — 급하게 여러 명 채용할 때. */
    THREE_DAY("3일권"),
    /** 7일권 — 상시채용 매장에 가장 잘 맞는 구간. */
    SEVEN_DAY("7일권"),
    /** 30일권 — 다점포·상시채용 사장님용. */
    THIRTY_DAY("30일권");

    private final String displayName;

    RecruitmentBoostPassProductCode(String displayName) {
        this.displayName = displayName;
    }
}
