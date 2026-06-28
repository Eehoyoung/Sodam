# 직원 홈 화면 디자인 및 매장 기준 출퇴근 조회 작업 보고서
작성일: 2026-06-29  
작업 범위: 직원 로그인 홈 화면 FE 개편, 매장 선택 기반 출퇴근/스케줄/급여 데이터 연동, BE 매장별 오늘 출퇴근 조회 API 보강, DB 영향 검토

## 1. 작업 배경

직원이 로그인했을 때 처음 보는 홈 화면을 `docs/codex/employee-home-screen-mockup.html` 시안 기준으로 실제 앱 화면에 반영했다.

이번 작업의 핵심 요구사항은 다음과 같다.

- 확정된 시안의 청량한 화면 톤을 실제 직원 홈 화면에 반영한다.
- 직원은 여러 매장에서 일할 수 있으므로, 홈 화면에서 매장을 선택할 수 있어야 한다.
- 선택한 매장에 따라 시급, 오늘 출퇴근 기록, 오늘/내일 스케줄, 월간 요약이 바뀌어야 한다.
- 기존 전체 직원 기준 오늘 출퇴근 조회만으로는 다중 매장 직원의 데이터가 섞일 수 있으므로, BE에서 매장 기준 조회를 지원해야 한다.
- DB는 필요한 경우에만 변경하고, 기존 스키마로 처리 가능한지 먼저 검토한다.

## 2. 작업 방식

이번 작업은 기존 코드 구조를 먼저 확인한 뒤, 변경 범위를 직원 홈 화면과 출퇴근 조회 API에 집중했다.

- FE 영역
  - 대상: `frontend/src/features/attendance/screens/EmployeeAttendanceHome.tsx`
  - 역할: 시안 기반 UI 구현, 매장 선택 UX 구현, 선택 매장 기준 데이터 로딩

- BE 영역
  - 대상: `AttendanceController`, `AttendanceService`, `AttendanceRepository`
  - 역할: 직원 오늘 출퇴근 기록을 특정 매장 기준으로 조회하는 API 추가

- DB 영역
  - 대상: 기존 `attendance`, `employee_store_relation`, `work_shift` 구조 검토
  - 결과: 신규 테이블/컬럼/Flyway migration 없이 기존 구조로 처리 가능

- 메인 세션
  - 역할: FE/BE 변경 통합, API 계약 조정, 컴파일 오류 복구, 테스트 실행 및 최종 검증

## 3. FE 작업 내용

### 3.1 직원 홈 화면 전면 개편

수정 파일:

- `frontend/src/features/attendance/screens/EmployeeAttendanceHome.tsx`

기존 직원 홈 화면은 출퇴근 중심의 단순 화면이었다. 이를 확정 시안의 방향에 맞춰 다음 구성으로 재작성했다.

- 상단 인사말과 알림/설정 액션
- 오늘 날짜 표시
- 매장 선택 영역
- 출퇴근 상태 카드
- 현재 근무 시간 또는 오늘 누적 근무 타이머
- 출근/퇴근 버튼
- 휴게 기록, 출퇴근 정정 버튼
- 오늘/내일 스케줄 요약
- 이번 달 예상 급여와 출근일 요약
- 빠른 메뉴
  - 내 스케줄
  - 급여
  - 계약서
  - 매장 합류
- 확인할 일 알림 영역

### 3.2 매장 선택 UX

시급 옆 화살표는 여러 매장에서 근무하는 직원을 위한 매장 선택 UI로 구현했다.

- 직원 소속 매장을 `storeService.getEmployeeStores(user.id)`로 조회한다.
- 소속 매장이 1개이면 해당 매장을 자동 선택한다.
- 소속 매장이 2개 이상이면 매장 선택 칩을 펼쳐 선택할 수 있다.
- 선택된 매장 기준으로 화면 데이터가 다시 로딩된다.

선택 매장에 따라 갱신되는 데이터:

- 매장명
- 시급
- 오늘 출퇴근 기록
- 출근/근무중/퇴근완료 상태
- 오늘/내일 스케줄
- 월간 출근일
- 월간 예상 급여

### 3.3 선택 매장 기준 데이터 연동

신규 BE endpoint를 호출하도록 직원 홈 화면을 변경했다.

```ts
GET /api/attendance/employee/{employeeId}/store/{storeId}/today
```

기존 월간 출퇴근 조회 API는 그대로 사용하되, FE에서 선택 매장 기준으로 필터링해 월간 요약을 계산한다.

스케줄은 기존 `fetchMyShifts` 흐름을 사용하고, 선택 매장의 스케줄만 화면에 표시한다.

## 4. BE 작업 내용

### 4.1 매장 기준 오늘 출퇴근 조회 API 추가

수정 파일:

- `backend/src/main/java/com/rich/sodam/controller/AttendanceController.java`

추가 API:

```http
GET /api/attendance/employee/{employeeId}/store/{storeId}/today
```

처리 흐름:

1. 로그인 사용자가 요청한 `employeeId` 본인인지 확인한다.
2. 직원이 요청한 `storeId` 매장에 소속되어 있는지 확인한다.
3. 오늘 00:00부터 다음날 00:00 전까지의 출퇴근 기록을 조회한다.
4. 선택 매장 기준 기록 1건을 반환한다.
5. 기록이 없으면 `204 No Content`를 반환한다.

### 4.2 Service 조회 로직 추가

수정 파일:

- `backend/src/main/java/com/rich/sodam/service/AttendanceService.java`

추가 메서드:

```java
getAttendancesByEmployeeStoreAndPeriod(
    Long employeeId,
    Long storeId,
    LocalDateTime startDate,
    LocalDateTime endDate
)
```

이 메서드는 직원과 매장을 각각 조회한 뒤, Repository에 직원+매장+기간 조건으로 출퇴근 기록 조회를 위임한다.

### 4.3 Repository 조회 조건 추가

수정 파일:

- `backend/src/main/java/com/rich/sodam/repository/AttendanceRepository.java`

추가 조회:

```java
findByEmployeeProfileAndStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(...)
```

`@EntityGraph`를 적용해 직원, 사용자, 매장 정보를 함께 로딩하도록 했다.

## 5. DB 작업 내용

DB 스키마 변경은 하지 않았다.

검토 결과, 현재 요구사항은 기존 구조로 처리 가능했다.

- `attendance`는 이미 출퇴근 기록과 매장 정보를 함께 가진다.
- `employee_store_relation`은 직원이 어떤 매장에 소속되어 있는지 판단할 수 있다.
- `work_shift`는 직원 스케줄을 매장 단위로 조회할 수 있는 구조를 가진다.

따라서 신규 migration은 만들지 않고, Repository 조회 조건과 API 계약만 보강했다.

## 6. 테스트 및 검증

### 6.1 FE 타입 검사

실행 명령:

```bash
npx.cmd tsc --noEmit
```

실행 위치:

```bash
frontend
```

결과:

- 성공
- 직원 홈 화면 변경 후 TypeScript 타입 오류 없음

### 6.2 BE 서비스 테스트

실행 명령:

```bash
cmd /c gradlew.bat --no-daemon test --tests com.rich.sodam.service.AttendanceServiceTest -x jacocoTestReport
```

실행 위치:

```bash
backend
```

결과:

- `BUILD SUCCESSFUL`
- 대상 테스트 통과

### 6.3 추가 테스트 케이스

수정 파일:

- `backend/src/test/java/com/rich/sodam/service/AttendanceServiceTest.java`

추가 테스트:

- `getAttendancesByEmployeeStoreAndPeriod_filtersByStore`

검증 내용:

- 한 직원이 두 매장에 소속된 상황을 만든다.
- 같은 날짜에 서로 다른 매장의 출근 기록을 생성한다.
- 특정 매장 기준으로 조회했을 때 해당 매장 기록만 반환되는지 확인한다.
- 선택 매장의 적용 시급이 정상 반환되는지 확인한다.

## 7. 작업 중 이슈 및 조치

### 7.1 컨트롤러 문서 문자열 복구

작업 중 `AttendanceController.java`의 일부 Swagger 설명 문자열 인코딩이 깨져 Java 문자열이 닫히지 않는 문제가 발생했다.

조치:

- 컨트롤러 파일을 원본 상태로 복구했다.
- 이번 기능에 필요한 신규 매장별 오늘 출퇴근 조회 API만 다시 삽입했다.
- 이후 BE 테스트를 재실행해 컴파일과 테스트 통과를 확인했다.

## 8. 최종 결과

이번 작업으로 직원 홈 화면은 확정 시안에 맞는 실제 사용 화면으로 교체되었다.

사용자는 직원 홈에서 다음을 할 수 있다.

- 현재 선택된 매장 확인
- 여러 매장 중 근무 매장 선택
- 선택 매장 기준 시급 확인
- 선택 매장 기준 오늘 출퇴근 상태 확인
- 출근/퇴근 처리 진입
- 휴게 기록과 출퇴근 정정 요청 진입
- 오늘/내일 스케줄 확인
- 월간 예상 급여와 출근일 확인
- 스케줄, 급여, 계약서, 매장 합류 화면으로 빠르게 이동

BE는 다중 매장 직원을 고려해 오늘 출퇴근 기록을 매장 기준으로 조회할 수 있게 되었고, DB는 기존 구조를 유지했다.

## 9. 변경 파일 요약

FE:

- `frontend/src/features/attendance/screens/EmployeeAttendanceHome.tsx`

BE:

- `backend/src/main/java/com/rich/sodam/controller/AttendanceController.java`
- `backend/src/main/java/com/rich/sodam/service/AttendanceService.java`
- `backend/src/main/java/com/rich/sodam/repository/AttendanceRepository.java`

Test:

- `backend/src/test/java/com/rich/sodam/service/AttendanceServiceTest.java`

Docs:

- `docs/codex/employee-home-implementation-report.md`
