package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 출근권 충전소(IAP) 상품 코드(recruitment-monetization-gamification-plan.md §2.4).
 *
 * <p>수량/가격은 여기(코드)에 두지 않는다 — 최종 가격이 미확정(§10)이라 전부
 * {@code AttendanceCreditProperties.Charge}(운영 중 조정 가능한 설정값)에서 가져온다. 이 enum은
 * 상품의 "정체성"(코드·표시명·인기 배지 여부)만 갖는다.</p>
 */
@Getter
public enum AttendanceCreditChargePackCode {

    /** 스몰 팩 — 진입장벽 낮춘 첫 결제 유도용. */
    SMALL("스몰 팩", false),
    /** 미디엄 팩 — "가장 인기" 배지. */
    MEDIUM("미디엄 팩", true),
    /** 라지 팩 — 볼륨 할인 최대. */
    LARGE("라지 팩", false),
    /** 스트릭 복구권 — 재화(출근권)가 아닌 1회권 단품. 소모(적용) 로직은 이번 범위 밖(훅만 마련). */
    STREAK_RECOVERY("스트릭 복구권", false);

    private final String displayName;
    private final boolean popularBadge;

    AttendanceCreditChargePackCode(String displayName, boolean popularBadge) {
        this.displayName = displayName;
        this.popularBadge = popularBadge;
    }

    /** 출근권(재화) 수량이 있는 상품인지 — 스트릭 복구권만 false(단품 티켓이라 첫구매 보너스 대상에서 제외). */
    public boolean isCreditPack() {
        return this != STREAK_RECOVERY;
    }
}
