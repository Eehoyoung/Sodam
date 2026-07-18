package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 사업자 단위(BusinessEntity) 유형(DB_OPTIMIZATION_PLAN.md §2.13, Phase 7 A단계).
 *
 * <p>A단계(스키마 도입)에서 생성되는 레코드는 모두 매장 1개 = 사업자 1개 자동 백필이라
 * {@link #INDIVIDUAL_MULTI_STORE}로 시작한다 — 실제 다지점 그룹핑(B단계)·본사 권한(D단계)이
 * 구현되기 전까지는 이 값이 그대로 유지된다.</p>
 */
@Getter
public enum BusinessEntityType {
    INDIVIDUAL_MULTI_STORE("개인사업자(다지점 가능)"),
    CORPORATE_HQ("법인 본지점"),
    FRANCHISE_HQ("프랜차이즈 본사");

    private final String description;

    BusinessEntityType(String description) {
        this.description = description;
    }
}
