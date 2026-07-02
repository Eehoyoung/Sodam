package com.rich.sodam.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 매장 위치 검증 (Haversine 반경 체크) 단위 테스트.
 */
class StoreLocationTest {

    private Store buildStoreAtSeoulCityHall() {
        Store store = new Store(
                "서울시청 매장",
                "1234567890",
                "02-555-1234",
                "음식점",
                10_000,
                100
        );
        // 서울시청: 37.5666, 126.9784
        store.updateLocation(37.5666, 126.9784, "서울특별시 중구 세종대로 110", 100);
        return store;
    }

    @Test
    void 같은좌표는항상반경내() {
        Store store = buildStoreAtSeoulCityHall();
        assertTrue(store.isUserInRadius(37.5666, 126.9784));
    }

    @Test
    void 백m이내는반경내() {
        Store store = buildStoreAtSeoulCityHall();
        // 약 50m 떨어진 좌표 (북쪽)
        assertTrue(store.isUserInRadius(37.5670, 126.9784));
    }

    @Test
    void 일km밖은반경밖() {
        Store store = buildStoreAtSeoulCityHall();
        // 광화문 (약 600m 북쪽) — 100m 반경 밖
        assertFalse(store.isUserInRadius(37.5759, 126.9769));
    }

    @Test
    void 위치미설정매장은항상false() {
        Store store = new Store(
                "위치없는 매장",
                "1234567890",
                "02-555-1234",
                "음식점",
                10_000,
                100
        );
        assertFalse(store.isUserInRadius(37.5666, 126.9784));
    }

    @Test
    void null좌표는false() {
        Store store = buildStoreAtSeoulCityHall();
        assertFalse(store.isUserInRadius(null, 126.9784));
        assertFalse(store.isUserInRadius(37.5666, null));
    }

    @Test
    void 반경확장후재검증() {
        Store store = buildStoreAtSeoulCityHall();
        // 광화문 좌표는 100m 밖
        assertFalse(store.isUserInRadius(37.5759, 126.9769));
        // 반경을 2000m 로 확장 (광화문은 약 1km 거리)
        store.setRadius(2000);
        assertTrue(store.isUserInRadius(37.5759, 126.9769));
    }

    @Test
    void 운영시간외출근은false() {
        Store store = buildStoreAtSeoulCityHall();
        // 새벽 3시 — 기본 OperatingHours.createDefault() 의 운영 외 시간 가정
        java.time.LocalDateTime night = java.time.LocalDateTime.of(2026, 5, 19, 3, 0);
        // 기본 운영시간 (9-22)이라면 새벽 3시는 false
        assertFalse(store.isOpenAt(night));
    }

    @Test
    void softDelete후매장비활성() {
        Store store = buildStoreAtSeoulCityHall();
        assertTrue(store.isActive());
        store.softDelete();
        assertFalse(store.isActive());
        assertTrue(store.isDeleted());
        // 삭제된 매장은 운영 중 false
        assertFalse(store.isOpenNow());
    }

    @Test
    void restore후매장재활성() {
        Store store = buildStoreAtSeoulCityHall();
        store.softDelete();
        store.restore();
        assertTrue(store.isActive());
        assertFalse(store.isDeleted());
    }
}
