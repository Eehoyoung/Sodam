# 근무 시프트 템플릿 — BE 영속 설계 (확정)

작성일: 2026-06-29
결정 주체: 사장님(사용자) 확정 / 구현: 메인 세션

## 1. 확정된 설계 방향

| 축 | 결정 | 비고 |
|---|---|---|
| 저장 범위 | **주간 패턴(직원 포함)** | 한 주치 (직원·요일·시간·메모) 묶음 저장 → 다른 주에 일괄 적용. 지난주복사의 진화형. |
| 공유 단위 | **매장별** | 템플릿은 한 매장 소속, 그 매장 사장(들)이 공유. |
| 직원 결합 | **직원 고정 + 비활성 스킵** | 엔트리에 employee_id 고정. 적용 시 비활성/퇴사 직원 항목은 건너뛰고 결과로 보고. |
| 플랜 게이팅 | **전 티어 허용** | @RequirePlan 미부착. 채택률 우선. |

> 시간 프리셋(직원 없는 시간블록)·바텀시트는 이번 범위 밖(후속).

## 2. 스키마 (Flyway V24, 운영은 인간 승인 후 실행 / dev·test는 ddl-auto)

```sql
CREATE TABLE shift_template (
    shift_template_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id              BIGINT NOT NULL,
    name                  VARCHAR(100) NOT NULL,
    created_by_master_id  BIGINT,
    created_at            DATETIME(6) NOT NULL,
    INDEX idx_shift_template_store (store_id)
);

CREATE TABLE shift_template_entry (
    shift_template_entry_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
    shift_template_id        BIGINT NOT NULL,
    employee_id              BIGINT NOT NULL,
    day_of_week              VARCHAR(10) NOT NULL,   -- MONDAY..SUNDAY
    start_time               TIME NOT NULL,
    end_time                 TIME NOT NULL,
    memo                     VARCHAR(200),
    INDEX idx_ste_template (shift_template_id),
    CONSTRAINT fk_ste_template FOREIGN KEY (shift_template_id)
        REFERENCES shift_template(shift_template_id) ON DELETE CASCADE
);
```

## 3. API (모두 @MasterOnly + StoreAccessGuard 매장 소유 검증)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/stores/{storeId}/shift-templates` | 현재 주(from~to) 시프트를 요일 패턴으로 스냅샷 저장. body `{name, from, to}` |
| GET | `/api/stores/{storeId}/shift-templates` | 매장 템플릿 목록 |
| GET | `/api/stores/{storeId}/shift-templates/{id}` | 템플릿 상세(엔트리 포함) |
| POST | `/api/stores/{storeId}/shift-templates/{id}/apply?weekStart=YYYY-MM-DD` | 해당 주(월요일 기준)에 일괄 생성 |
| DELETE | `/api/stores/{storeId}/shift-templates/{id}` | 삭제(엔트리 cascade) |

### 적용(apply) 동작
- `weekStart`(월요일) + 엔트리 `day_of_week` 오프셋(MON=0..SUN=6) → 생성 날짜 계산.
- 엔트리 직원이 **현재 매장 활성 직원**이 아니면 건너뛰고 `skipped[]`에 사유와 함께 보고.
- 야간(종료≤시작) 그대로 보존. 시각 검증(동일시각 거부)은 WorkShift 생성 경로와 동일.
- 응답: `{ createdCount, skippedCount, skipped: [{employeeId, dayOfWeek, reason}] }`

### 저장(snapshot) 동작
- from~to 범위 시프트를 읽어 각 시프트의 `shiftDate.getDayOfWeek()`를 엔트리 요일로 저장.
- 범위에 시프트가 없으면 400(저장할 근무 없음).

## 4. 미해결/후속
- 시간 프리셋(직원 없는 블록) 탭, 바텀시트형 추가 — 후속.
- 적용 시 기존 동일 시프트 중복 — FE dedup + 적용 결과 안내로 1차 방어(서버 유니크 제약은 후속).
