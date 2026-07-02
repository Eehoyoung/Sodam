package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 매입 영수증 분류. 가격비교·발주참고를 카테고리 단위로 묶기 위함.
 *
 * <p>경계: 매입(사는 것) 기록·비교까지만. 재고 차감·원가율·메뉴마진(POS)은 다루지 않는다.
 * (IDENTITY §8 개정 2026-06-16)
 */
@Getter
public enum PurchaseCategory {
    VEGETABLE("야채·청과"),
    MEAT("육류"),
    SEAFOOD("수산"),
    LIQUOR("주류"),
    BEVERAGE("음료"),
    SUPPLIES("소모품"),
    ETC("기타");

    private final String description;

    PurchaseCategory(String description) {
        this.description = description;
    }
}
