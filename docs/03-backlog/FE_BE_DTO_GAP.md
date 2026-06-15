# FE↔BE DTO 매핑 누락 전수 점검 (2026-05-24 발견 · 2026-05-29 회수 완료)

발견 사례: SignupScreen 약관 3필드 누락 → 400 회귀 방지용. BE `@Valid/@Validated` 가 붙은 RequestDto 만 대상.

> **상태 (2026-05-29):** P0 8건 ✅ · P1 1건 ✅ 모두 회수 완료. P2 5건 검토 후 잔여.

## P0 (즉시 fix 필요 — 필수 필드 누락/이름 불일치로 400 또는 silent fail 확정)

- [x] `frontend/src/features/attendance/services/attendanceService.ts:25-44` (toAttendancePayload 헬퍼) → `POST /api/attendance/check-in` · `POST /api/attendance/check-out`
  - 회수: employeeId/storeId/latitude/longitude 4필드 모두 throw-on-missing 으로 fail-fast.
- [x] `frontend/src/features/attendance/hooks/useAttendance.ts:185,230` → checkIn/checkOut 호출 시 employeeId + 좌표 명시 전달.
- [x] `frontend/src/features/attendance/screens/AttendanceScreen.tsx` → 모든 분기(standard/location/NFC)에서 service 헬퍼 경유로 4필드 보장.
- [x] `frontend/src/features/attendance/services/nfcAttendanceService.ts:9` → BE `NfcVerifyRequest.tagId` 와 동일 키 `tagId` 사용. 이전 `nfcTagId` 오타 제거.
- [x] `frontend/src/features/auth/services/authService.ts` → SignupRequest 에 `ageConfirmed`/`termsAgreed`/`privacyAgreed` 추가, `/api/join` 호출 시 전달.
- [x] `frontend/src/features/salary/services/payrollService.ts:11-12` → PayrollCalculatePayload 키를 `startDate`/`endDate` 로 통일 (BE PayrollCalculationRequestDto 정합).
- [x] `frontend/src/features/myPage/services/timeOffService.ts:5-7` → TimeOffRequestPayload 키를 `startDate`/`endDate`/`reason` 으로 통일 (BE TimeOffCreateRequest 정합).

## P1 (선택 필드/필드명 불일치로 silent fail — 400 은 안 나지만 기능 손상)

- [x] `frontend/src/features/wage/services/wageService.ts` upsertEmployeeWage — BE EmployeeWageUpdateDto 키 정합.
  - 회수 (2026-05-29): FE 친화 `hourlyWage`/`useStoreStandardWage` 인터페이스 유지 + 서비스 경계에서 `customHourlyWage`/`useStoreStandardWage` 로 변환해 전송. `useStoreStandardWage` 기본값은 `!hourlyWage`. 응답도 BE 키 그대로 노출하고 `hourlyWage` alias 채워 호환 보장.

## P2 (이름/타입 mismatch — 경고만, 동작은 함)

- [ ] `frontend/src/features/store/services/storeService.ts` (changeOwner) → `POST /api/stores/change/master` | BE 컨트롤러 주석 처리 → 404. 사용 시점 fallback mock 동작.
  - 결정 필요: 코드 제거 vs BE 활성화 협의 (CEO 결재 필요할 수 있음 — 매장 양도 정책).
- [ ] `frontend/src/features/myPage/services/salaryManagementService.ts`, `frontend/src/features/salary/services/salaryService.ts` 다수 `/salary/*` 호출 → BE 매핑 없음. legacy 추정.
  - 결정 필요: 사용 여부 확인 후 제거 또는 `/api/payroll/*` 로 통합.
- [ ] `frontend/src/features/myPage/services/reportService.ts` `/reports/*` → BE 미존재.
  - 결정 필요: 동일.
- [ ] `frontend/src/features/attendance/services/locationAttendanceService.ts:52-72` (verifyCheckOutByLocation) → body 의 `isCheckOut:true` 가 BE LocationVerifyRequest 에 없어 무시됨.
  - 결정 필요: BE 가 verify/location 에서 checkout 구분 안 함을 명시하거나 BE 에 필드 추가. (의도는 다르지만 동작은 정상)
- [ ] `frontend/src/features/auth/services/userService.ts:8` (setPurpose) | FE 대문자 `EMPLOYER/EMPLOYEE` ↔ BE 소문자 슬러그. 호출처 없음(미사용).
  - 결정 필요: 코드 삭제 vs authApi.setPurpose 와 동일 슬러그로 통일.

## 총: P0 8/8 ✅ · P1 1/1 ✅ · P2 0/5 (검토 대기)

### 주의 (잠재 P0 — 신규 화면 연동 시점에 검증)

- BE `EmployeeUpdateDto` (`PUT /api/user/{employeeId}`) 는 `@NotBlank name`, `@NotBlank @Email email` 요구. FE `userService.updateEmployee` 는 `Partial<UserProfile>` 로 호출 → 호출부에서 name/email 둘 다 채워 보내지 않으면 400. 마이페이지 이름 수정 흐름에서 이미 name 만 보내고 있어 백엔드 변경 또는 email 추가 필요.
- BE `PayrollPolicyUpdateDto` `taxPolicyType` @NotNull. FE 호출 코드 미발견(미연동).
- BE `OperatingHoursUpdateDto` 매장 운영시간: FE 연동 미발견. 신규 화면 연동 시 7요일 모두 + isClosed 필수.
- BE `JoinStoreByCodeRequest.storeCode` @NotBlank @Size(8-60). FE 호출 확인됨 (JoinStoreByCodeScreen). storeCode 정규화 후 8자 이상만 제출 — 회수 완료.

### 회수 검증

- FE tsc: 0 에러
- features+auth jest: 11 suites · 53/53 PASS
- E2E (`scripts/e2e-data-flow-and-billing.sh`): 13 PASS (직전 세션)
- BE: 142/142 PASS (직전 세션)
