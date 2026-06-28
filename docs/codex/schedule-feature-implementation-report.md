# 사장 화면 스케줄 작성 및 알림 기능 작업내역서

작성일: 2026-06-29  
작업 범위: 사장 화면 스케줄 진입점, 스케줄 작성 UX, 스케줄 확정 알림 API, DB 확정/알림 상태 저장

## 1. 작업 배경

사장 화면의 `매장 관리` 영역에 스케줄 기능을 추가하고, 사장이 직원별 주간 근무 일정을 작성한 뒤 확정 알림을 보낼 수 있도록 FE/BE/DB를 함께 수정했다.

사용자 요구사항의 핵심은 다음과 같다.

- 기존 `내 매장` 섹션, 매장 카드, `매장 추가` 버튼은 유지한다.
- 기존 1줄 4개 매장 관리 버튼 아래에 두 번째 줄 4개 버튼을 추가한다.
- 두 번째 줄은 `스케줄` 1개 활성 버튼과 `준비중` 3개 버튼으로 구성한다.
- 스케줄 화면은 사장이 실제로 작성하기 쉬운 UX를 우선한다.
- 스케줄 확정 시 대상 직원에게 알림을 보낼 수 있어야 한다.
- DB도 확정/알림 상태를 추적할 수 있게 손본다.

## 2. 작업 방식

사용자 지시에 따라 FE, BE, DB 에이전트를 각각 1개씩 생성해 병렬 작업했고, 메인 세션은 관리감독, 지시, 통합 검토, 테스트를 담당했다.

- FE 에이전트: `Gauss`
  - 담당 범위: 사장 화면 버튼 추가, 스케줄 화면, FE 서비스 연동, TypeScript 검증
- BE 에이전트: `Hubble`
  - 담당 범위: WorkShift API/서비스, 소속 직원 검증, 확정 알림 API, 서비스 테스트
- DB 에이전트: `James`
  - 담당 범위: WorkShift 확정/알림 저장 구조, Flyway migration, repository 테스트
- 메인 세션
  - 담당 범위: 요구사항 해석 유지, endpoint 불일치 조정, ID/알림 대상 검토, 최종 테스트 실행, 작업내역서 작성

## 3. FE 작업 내용

### 3.1 사장 화면 매장 관리 버튼 확장

수정 파일:

- `frontend/src/features/myPage/screens/MasterMyPageScreen.tsx`

변경 내용:

- 기존 `내 매장` 섹션, 매장 카드, `매장 추가` 버튼은 그대로 유지했다.
- `매장 관리` 버튼 배열을 4개에서 8개로 확장했다.
- 두 번째 줄에 다음 버튼을 추가했다.
  - `스케줄`: 활성 버튼, 첫 번째 매장 기준으로 스케줄 화면 진입
  - `준비중` 3개: 비활성 스타일 적용
- 매장이 없을 때 `스케줄`을 누르면 기존 흐름과 같이 매장 등록을 유도한다.

### 3.2 스케줄 화면 추가

추가 파일:

- `frontend/src/features/shift/screens/StoreScheduleScreen.tsx`

변경 내용:

- 사장용 주간 스케줄 화면을 새로 만들었다.
- 화면 구성:
  - 이번 주 기간 표시
  - 근무 건수, 직원 수, 총 근무시간 요약
  - `지난주 복사`
  - `확정하고 알림`
  - 직원 선택 칩
  - 날짜, 시작시간, 종료시간, 메모 입력
  - 주간 스케줄 목록
- 기존 `storeService.getStoreEmployees`로 매장 직원 목록을 조회한다.
- 기존 `fetchStoreShifts`, `createShift`, `shortTime`, `thisWeekRange`를 재사용했다.
- 지난주 복사는 지난주 shift를 조회한 뒤 7일을 더해 기존 생성 API로 복사한다.

### 3.3 FE 서비스 및 네비게이션 연동

수정 파일:

- `frontend/src/features/shift/services/shiftService.ts`
- `frontend/src/navigation/HomeNavigator.tsx`

변경 내용:

- `StoreSchedule` route를 추가했다.
- `confirmStoreWeekShifts` 함수를 추가했다.
- 최종 BE endpoint에 맞춰 `POST /api/stores/{storeId}/shifts/notify`를 호출하도록 정리했다.
- 요청/응답 타입:

```ts
type Request = {
  from: string;
  to: string;
};

type Response = {
  storeId: number;
  from: string;
  to: string;
  confirmedCount: number;
  notifiedCount: number;
};
```

## 4. BE 작업 내용

### 4.1 스케줄 생성 검증 보강

수정 파일:

- `backend/src/main/java/com/rich/sodam/service/WorkShiftService.java`
- `backend/src/main/java/com/rich/sodam/repository/EmployeeStoreRelationRepository.java`
- `backend/src/test/java/com/rich/sodam/service/WorkShiftServiceTest.java`

변경 내용:

- 스케줄 생성 시 `employeeId`가 해당 `storeId`에 활성 상태로 소속된 직원인지 서버에서 검증한다.
- 타 매장 직원 또는 비활성 직원의 스케줄 생성은 `AccessDeniedException`으로 실패한다.
- 기존에는 storeId와 employeeId 조합을 신뢰하는 구조였지만, 이제 서버에서 소속 관계를 강제한다.

### 4.2 확정하고 알림 API 추가

수정/추가 파일:

- `backend/src/main/java/com/rich/sodam/controller/WorkShiftController.java`
- `backend/src/main/java/com/rich/sodam/service/WorkShiftService.java`
- `backend/src/main/java/com/rich/sodam/service/NotificationService.java`
- `backend/src/main/java/com/rich/sodam/dto/request/WorkShiftNotifyRequest.java`
- `backend/src/main/java/com/rich/sodam/dto/response/WorkShiftNotifyResponse.java`

추가 API:

```http
POST /api/stores/{storeId}/shifts/notify
```

요청:

```json
{
  "from": "2026-06-15",
  "to": "2026-06-21"
}
```

응답:

```json
{
  "storeId": 1,
  "from": "2026-06-15",
  "to": "2026-06-21",
  "confirmedCount": 3,
  "notifiedCount": 2
}
```

동작 방식:

- 기간 내 미확정 shift를 확정 처리한다.
- 확정됐지만 아직 확정 알림 발송 표시가 없는 shift만 알림 대상으로 삼는다.
- 같은 직원에게 여러 shift가 있어도 알림은 1회만 보낸다.
- 알림 호출 후 해당 shift에 알림 발송 시각을 남겨 중복 발송을 막는다.
- `from`, `to` 누락 또는 `from > to`는 서비스에서도 방어한다.

### 4.3 직원 본인 스케줄 조회 정책 변경

변경 내용:

- `/api/shifts/my`는 확정된 shift만 반환하도록 변경했다.
- 사장이 작성 중인 초안 상태의 스케줄이 직원에게 먼저 노출되지 않게 하기 위한 정책이다.

## 5. DB 작업 내용

### 5.1 WorkShift 확정/알림 상태 추가

수정/추가 파일:

- `backend/src/main/java/com/rich/sodam/domain/WorkShift.java`
- `backend/src/main/java/com/rich/sodam/repository/WorkShiftRepository.java`
- `backend/src/main/resources/db/migration/V23__work_shift_confirmation.sql`
- `backend/src/test/java/com/rich/sodam/repository/WorkShiftRepositoryTest.java`

추가 컬럼:

- `work_shift.confirmed_at`
  - `NULL`: 미확정
  - 값 있음: 확정됨
- `work_shift.confirmation_notification_sent_at`
  - `NULL`: 확정 알림 미발송
  - 값 있음: 확정 알림 발송 완료 또는 발송 불필요

### 5.2 기존 데이터 백필 정책

최종 migration 정책:

```sql
ALTER TABLE `work_shift`
    ADD COLUMN `confirmed_at` DATETIME(6) NULL AFTER `created_at`,
    ADD COLUMN `confirmation_notification_sent_at` DATETIME(6) NULL AFTER `confirmed_at`;

UPDATE `work_shift`
SET `confirmed_at` = `created_at`,
    `confirmation_notification_sent_at` = `created_at`
WHERE `confirmed_at` IS NULL;
```

이 정책을 선택한 이유:

- 기존 `work_shift`는 과거 UX에서 생성 즉시 직원에게 조회될 수 있던 일정이다.
- 기존 데이터를 `confirmed_at`만 채우고 `confirmation_notification_sent_at`을 비워두면, 첫 notify API 호출 때 과거 일정까지 새 알림 대상이 된다.
- 따라서 기존 일정은 “이미 공개된 확정 일정이며 새 확정 알림은 발송 불필요”로 보고 두 시각을 모두 `created_at`으로 백필했다.

## 6. 테스트 결과

메인 세션에서 최종 직접 검증한 결과는 다음과 같다.

### 6.1 FE TypeScript

명령:

```powershell
npx.cmd tsc --noEmit
```

위치:

```text
frontend
```

결과:

- 성공
- TypeScript 오류 없음

### 6.2 BE WorkShiftServiceTest

명령:

```powershell
cmd /c gradlew.bat --no-daemon test --tests com.rich.sodam.service.WorkShiftServiceTest -x jacocoTestReport
```

위치:

```text
backend
```

결과:

- `BUILD SUCCESSFUL`
- 검증 내용:
  - 매장 소속 직원 스케줄 생성 성공
  - 타 매장 직원 스케줄 생성 실패
  - 비활성 직원 스케줄 생성 실패
  - 확정 전 직원 본인 조회 미노출
  - 확정 후 직원 본인 조회 노출
  - 확정 알림 기간 validation
  - 같은 직원 다중 shift 알림 1회
  - 두 번째 호출 중복 발송 없음

### 6.3 BE WorkShiftRepositoryTest

명령:

```powershell
cmd /c gradlew.bat --no-daemon test --tests com.rich.sodam.repository.WorkShiftRepositoryTest -x jacocoTestReport
```

위치:

```text
backend
```

결과:

- `BUILD SUCCESSFUL`
- 검증 내용:
  - 확정/알림 시각 저장
  - 확정/미확정 shift 분리 조회
  - 확정됐지만 알림 미발송인 shift 조회
  - 기존 데이터 백필 정책상 알림 발송 완료 처리된 shift는 알림 대상에서 제외

## 7. 최종 구현 결과

이번 작업으로 사장은 사장 화면에서 다음 흐름으로 스케줄을 관리할 수 있다.

1. 사장 화면 진입
2. 기존 `내 매장` 섹션에서 매장 상태 확인
3. `매장 관리` 두 번째 줄의 `스케줄` 버튼 선택
4. 이번 주 스케줄 화면 진입
5. 직원별 날짜/시간/메모로 근무 추가
6. 필요 시 지난주 스케줄 복사
7. `확정하고 알림`으로 직원에게 확정 알림 발송

백엔드는 스케줄 생성 시 직원 소속을 검증하고, DB는 확정 상태와 알림 발송 상태를 저장한다. 직원 화면에서는 확정된 스케줄만 조회되므로 작성 중인 일정이 먼저 노출되지 않는다.

## 8. 남은 리스크 및 후속 권장 사항

- `지난주 복사`는 현재 FE에서 기존 생성 API를 반복 호출한다. 같은 주에 여러 번 복사하면 중복 shift가 생길 수 있으므로, 후속 작업에서 BE bulk copy API와 중복 방지 정책을 추가하는 것이 좋다.
- 현재 확정 알림은 기존 알림 인프라의 best-effort 정책을 따른다. 실제 푸시 성공 여부와 별개로 서비스 호출 후 발송 완료 시각을 남긴다.
- 스케줄 수정 API는 아직 없다. 잘못 추가한 일정은 기존 삭제 API로 지우고 다시 등록하는 흐름이다.
- 터치 드래그형 캘린더 UX는 이번 범위에서는 제외했다. 현재는 안정적인 입력형 MVP이며, 추후 직원 수가 많은 매장 대상으로 드래그/슬라이딩 편집을 추가할 수 있다.
