package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 인증채용(구직·구인) 업종 분류 — 구직자가 최대 3개 선택(260711_작업통합.md Part 2 §2 #11).
 *
 * <p>매장 업종(`Store.businessType`, 자유 문자열)과 별개의 고정 12종 분류다. 구직자 리스트 조회 시
 * 매장 업종과 매핑되어 "업종 일치" 강조에 쓰인다(매핑 로직은 Phase 2 서비스 책임).</p>
 */
@Getter
public enum JobCategory {
    CAFE("카페"),
    BAKERY("베이커리"),
    RESTAURANT_HALL("음식점 홀/서빙"),
    KITCHEN("주방/조리"),
    FAST_FOOD("패스트푸드"),
    FAMILY_RESTAURANT("패밀리레스토랑"),
    CONVENIENCE_STORE("편의점"),
    MART_SALES("마트/판매"),
    PUB_BAR("술집/바"),
    DELIVERY_DRIVING("배달/운전"),
    OFFICE_SIDE_JOB("사무/부업"),
    ETC("기타");

    private final String description;

    JobCategory(String description) {
        this.description = description;
    }
}
