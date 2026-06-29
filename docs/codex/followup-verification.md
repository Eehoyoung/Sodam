# Codex 작업 검증 및 후속 조치 결과

작성일: 2026-06-29
검증 범위: docs/codex 3개 작업(직원 홈·스케줄·매장등록 운영시간) 통합 검증 + 후속 조치

## 1. 검증 결과 — 3개 작업 모두 정상

메인 브랜치(WebSocket 실시간 동기화·캐시 수정 등 동시 작업)와 **통합한 트리에서** 컴파일·테스트·타입체크를 재실행해 정상 동작을 확인했다.

| 항목 | 결과 |
|---|---|
| BE `compileTestJava` (main+test) | ✅ EXIT 0 |
| BE 테스트 5종(AttendanceService·WorkShiftService·WorkShiftRepository·StoreAttendanceWindow·StoreSettings) | ✅ BUILD SUCCESSFUL |
| FE `tsc --noEmit` | ✅ EXIT 0 |
| Flyway 마이그레이션 | ✅ V1~V23 순차, 중복 없음(V23 유일) |

### 기능별 배선 확인(end-to-end)
- **직원 홈**: FE `GET /api/attendance/employee/{id}/store/{storeId}/today` ↔ BE `@GetMapping("/employee/{employeeId}/store/{storeId}/today")` **일치**. 다중 매장 직원 매장 선택→매장별 데이터 로딩 동작.
- **스케줄**: MasterMyPage `스케줄` 버튼→`navigate('StoreSchedule')`→`HomeNavigator` 라우트 등록→`StoreScheduleScreen`→`confirmStoreWeekShifts` `POST /api/stores/{storeId}/shifts/notify` ↔ BE `WorkShiftController` **일치**. `/api/shifts/my` 확정분만 노출.
- **매장등록 운영시간**: 3단계 플로우→`operatingHours` 배열→`StoreRegistrationDto`+`FlexibleLocalTimeDeserializer`(HHmm/HH:mm/HH:mm:ss)→`StoreManagementServiceImpl` 검증·저장. `isWithinAttendanceWindowAt` 도메인 메서드+테스트 존재.

## 2. 후속 조치 — 이번에 처리

### ✅ 지난주 복사 중복 방지 (StoreScheduleScreen)
Codex 보고서가 남긴 리스크(지난주 복사 반복 시 중복 shift 생성)를 클라이언트 측 dedup 으로 차단.
- 복사 전 이번 주 기존 근무(직원+날짜+시작시간) 집합과 대조해 동일 근무는 건너뛴다.
- 전부 중복이면 "이미 이번 주에 복사돼 있어요" 안내.

## 3. 남은 후속 권장 (추적 필요, 이번 미처리)

| # | 항목 | 성격 | 비고 |
|---|---|---|---|
| 1 | `Store.isWithinAttendanceWindowAt` 미배선 | 인프라 대기 | 메서드·테스트는 정상이나 호출처 없음. '이상출퇴근' 분류 기능이 아직 없어 소비처가 없음. AttendanceMissingScheduler 는 별개 임계값(open+30·close+60)으로 누락 감지 중 — 의미가 달라 강제 연결하지 않음. 이상출퇴근 기능 도입 시 연결. |
| 2 | ~~스케줄 수정 API 부재~~ ✅ **해소** | 기능 갭 | `PUT /api/stores/{storeId}/shifts/{shiftId}` 추가(2026-06-29). 날짜·시각·메모 변경, 변경 시 확정·알림 리셋(직원 통보 정합성). FE 수정모드(탭→프리필+수정/삭제/취소) 배선. |
| 3 | ~~야간영업(자정 넘김) 미지원~~ ✅ **스케줄 한정 해소** | 기능 갭 | 시프트는 종료≤시작이면 익일 종료(야간)로 허용(`crossesMidnight`), 듀레이션 랩어라운드 계산, FE '익일' 표시(2026-06-29). **운영시간(OperatingHours) 도메인은 별도 미적용** — 출퇴근 윈도우·누락스케줄러가 같은날 가정이라 리스크. 심야 매장 운영시간 자체가 필요해지면 별도 작업. |
| 4 | 운영시간 수정 화면 UX 불일치 | UX | 등록은 `1000`(HHmm), 수정 화면은 `09:00`. BE 는 둘 다 수용하나 화면 통일 권장. |
| 5 | 지난주 복사 서버측 bulk/dedup | 견고화 | 현재 FE dedup + 반복 createShift. 다중 클라이언트 동시성까지 막으려면 BE bulk-copy+유니크 제약 권장. |

### 추가 신규 기능 (2026-06-29)
- **드래그앤드롭 주간 보드**: `WeeklyShiftBoard` — 근무를 길게 눌러 다른 요일로 끌면 `PUT shift`로 날짜만 이동(낙관적 갱신). 행 고정높이로 translationY→일 단위 환산(좌표측정 불필요). gesture-handler Pan(롱프레스 220ms)+reanimated. 스케줄 화면 목록/보드 토글.
  - ✅ **에뮬레이터 E2E 검증 완료(2026-06-29)**: FreshBoss(store 8)에 더미 시프트 4건(야간 1건 포함) API 생성 → 사장 로그인 → 보드 진입. 보드 렌더·'익일' 배지·총시간 31.0h(야간 18:00~02:00을 8h로 정확 계산) 확인. 드래그 다운(월→목)·드래그 업(수→월, 야간칩) 모두 성공, DB(shiftDate) 영속 + 화면 즉시 반영 교차검증. adb `input motionevent DOWN→sleep→MOVE…→UP` 단일 셸 시퀀스로 롱프레스+팬 발화 가능(단일 `input swipe`는 롱프레스 미발화).

## 4. 결론
Codex 3개 작업은 통합 트리에서 컴파일·테스트·타입체크 전부 통과하며 FE↔BE 계약이 일치한다. 정상 완료로 판단한다. 즉시 가치 있는 후속(지난주 복사 중복 방지)은 처리했고, 나머지는 위 표로 추적한다.
