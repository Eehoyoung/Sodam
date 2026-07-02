package com.rich.sodam.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 사장 전용 직원 메모(ownerMemo) 도메인 룰 검증 — 외부 의존성 없는 순수 단위 테스트.
 *
 * 왜 도메인에서 검증하는가?
 * - 메모는 사장만 보는 비공개 필드. 직원에게 노출 시 신뢰 손상 → 도메인 가드가 1차 방어선.
 * - 500자 한도는 DB 컬럼 길이 제약과 일치해야 한다 (EmployeeStoreRelation.ownerMemo length=500).
 */
class EmployeeStoreRelationMemoTest {

    private Store buildStore() {
        Store store = new Store(
                "테스트 매장",
                "1234567890",
                "02-555-1234",
                "음식점",
                12_000,
                100
        );
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        return store;
    }

    private EmployeeProfile buildEmployee() {
        User user = new User("staff@example.com", "테스트 직원");
        return new EmployeeProfile(user);
    }

    @Test
    void ownerMemo_초기값은null() {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(buildEmployee(), buildStore());
        assertNull(rel.getOwnerMemo(), "신규 관계 생성 시 ownerMemo 는 null 이어야 한다.");
    }

    @Test
    void ownerMemo_정상저장() {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(buildEmployee(), buildStore());
        rel.setOwnerMemo("성실하고 책임감 있음. 토요일 가능.");
        assertEquals("성실하고 책임감 있음. 토요일 가능.", rel.getOwnerMemo());
    }

    @Test
    void ownerMemo_빈문자열도허용() {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(buildEmployee(), buildStore());
        rel.setOwnerMemo("");
        assertEquals("", rel.getOwnerMemo());
    }

    @Test
    void ownerMemo_500자경계() {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(buildEmployee(), buildStore());
        String maxMemo = "x".repeat(500);
        rel.setOwnerMemo(maxMemo);
        assertEquals(500, rel.getOwnerMemo().length(),
                "DB 컬럼 한도(500)와 동일 길이는 저장 가능해야 한다.");
    }
}
