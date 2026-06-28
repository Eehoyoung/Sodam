# 매장등록 운영시간 단계형 플로우 작업 보고서

작성일: 2026-06-29  
작업 범위: 매장등록 FE/BE, 운영시간 입력/저장, 출퇴근 운영시간 허용 범위

## 1. 작업 배경

기존 매장등록은 운영시간을 등록 과정에서 명시적으로 받지 않고, 백엔드 `Store` 생성자에서 기본 운영시간을 설정해 `null`을 피하는 방식이었다.

이번 작업의 목표는 다음과 같다.

- 매장 생성 시점에 사장이 운영시간을 입력하도록 한다.
- 입력 UX는 24시간제 4자리 숫자 형식으로 한다.
  - 예: `1000` 입력 시 `10:00`으로 해석한다.
- 입력 오류를 명확하게 보여준다.
  - 4자리 숫자가 아니면 `4자리 숫자를 적어주세요`
  - 시간/분 범위가 잘못되면 `다시입력해 주세요`
- 운영시간은 모든 요일이 같을 수도 있고, 특정 요일만 다를 수도 있고, 매일 다를 수도 있어야 한다.
- 매장 오픈/마감 전후 1시간은 일반적인 출퇴근 준비/마감 정리 시간으로 보고 이상출퇴근으로 잡히지 않도록 한다.

## 2. 작업 방식

사용자 요청에 따라 FE 담당 에이전트 1개, BE 담당 에이전트 1개를 생성해 분리 작업했다.

- FE 에이전트: `Russell`
  - 담당 범위: `frontend` 하위 매장등록 화면 및 매장등록 API 타입
  - 결과: 정상 완료
- BE 에이전트: `Lagrange`
  - 담당 범위: `backend` 하위 DTO, 서비스, 도메인, 테스트
  - 결과: 응답 지연 상태였으나 backend 변경이 들어와 있었고, 메인 세션에서 검토/보정/테스트를 완료
- 메인 세션
  - 역할: 작업 관리, 변경 충돌 방지, BE 보정, 통합 검토, 테스트 실행, 최종 평가

분리 기준은 다음과 같이 잡았다.

- FE는 매장등록 화면 흐름과 payload 생성만 담당한다.
- BE는 payload 수신, 검증, 저장, 출퇴근 허용 범위 도메인 로직만 담당한다.
- 서로의 파일을 수정하지 않도록 작업 범위를 분리했다.

## 3. FE 작업 내용

### 3.1 매장등록 단계형 플로우

수정 파일:

- `frontend/src/features/store/StoreRegistraionScreen.tsx`
- `frontend/src/features/store/services/storeService.ts`

매장등록 화면을 단일 화면 입력 방식에서 3단계 플로우로 변경했다.

1. 기본정보
   - 매장명
   - 업종
   - 사업자등록번호
   - 연락처
   - 주소
   - 출퇴근 인증 반경
   - 매장 기본 시급

2. 운영시간
   - `매일 같음`
   - `요일별 설정`
   - 빠른 액션
     - `매일 같음 복사`
     - `평일/주말 빠른 설정`
     - `일요일 휴무`

3. 확인 및 등록
   - 기본정보 요약
   - 운영시간 요약
   - 최종 `매장 등록하기` 버튼에서만 API 호출

### 3.2 운영시간 입력 UX

운영시간 입력은 사용자에게 `:` 입력을 요구하지 않는 방식으로 구현했다.

예:

- `0900` -> `09:00:00`
- `1000` -> `10:00:00`
- `2200` -> `22:00:00`

프론트 내부 검증 함수는 다음 기준을 사용한다.

- 정규식 `^\d{4}$`에 맞지 않으면 `4자리 숫자를 적어주세요`
- 앞 두 자리 HH가 `00~23` 범위를 벗어나거나 뒤 두 자리 MM이 `00~59` 범위를 벗어나면 `다시입력해 주세요`

검증 예:

- `930` -> `4자리 숫자를 적어주세요`
- `abcd` -> 숫자가 아니므로 입력 단계에서 제거되고, 최종 값이 4자리가 아니면 `4자리 숫자를 적어주세요`
- `2500` -> `다시입력해 주세요`
- `1060` -> `다시입력해 주세요`
- `1000` -> 정상

### 3.3 FE/BE payload 계약

`storeService.ts`에 다음 타입을 추가했다.

```ts
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface StoreOperatingHourPayload {
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}
```

매장등록 payload에는 `operatingHours` 배열이 포함된다.

```ts
operatingHours: StoreOperatingHourPayload[];
```

FE는 최종 제출 시 월~일 7개 요일을 모두 만들어 보낸다.

영업일 예:

```json
{
  "dayOfWeek": "MONDAY",
  "openTime": "10:00:00",
  "closeTime": "22:00:00",
  "isClosed": false
}
```

휴무일 예:

```json
{
  "dayOfWeek": "SUNDAY",
  "openTime": null,
  "closeTime": null,
  "isClosed": true
}
```

## 4. BE 작업 내용

### 4.1 매장 생성 DTO 확장

수정 파일:

- `backend/src/main/java/com/rich/sodam/dto/request/StoreRegistrationDto.java`

매장등록 요청 DTO에 운영시간 배열을 추가했다.

```java
@Valid
private List<OperatingHoursUpdateDto.DayOperatingHours> operatingHours;
```

기존 운영시간 수정 API에서 쓰던 `DayOperatingHours` 구조를 재사용했다. 이 방식은 매장 생성과 운영시간 수정 API의 데이터 구조를 맞춰 중복 모델을 줄이는 장점이 있다.

### 4.2 flexible time deserializer 추가

추가 파일:

- `backend/src/main/java/com/rich/sodam/dto/request/FlexibleLocalTimeDeserializer.java`

운영시간 입력 형식을 유연하게 받기 위해 `LocalTime` 역직렬화기를 추가했다.

지원 형식:

- `HHmm`
- `HH:mm`
- `HH:mm:ss`

검증 메시지:

- 4자리 숫자가 아니면 `4자리 숫자를 적어주세요`
- 시간/분 범위가 잘못되면 `다시입력해 주세요`

예:

- `0930` -> `09:30`
- `09:30` -> `09:30`
- `09:30:00` -> `09:30`
- `930` -> 예외 메시지 `4자리 숫자를 적어주세요`
- `2460` -> 예외 메시지 `다시입력해 주세요`

### 4.3 기존 운영시간 DTO 보강

수정 파일:

- `backend/src/main/java/com/rich/sodam/dto/request/OperatingHoursUpdateDto.java`

`openTime`, `closeTime` 필드에 `FlexibleLocalTimeDeserializer`를 연결했다.

이로 인해 기존 운영시간 수정 API도 `HH:mm`, `HH:mm:ss`뿐 아니라 `HHmm` 입력을 받을 수 있다.

### 4.4 매장 생성 시 운영시간 반영

수정 파일:

- `backend/src/main/java/com/rich/sodam/service/StoreManagementServiceImpl.java`

매장 생성 흐름에서 다음 방식으로 처리한다.

1. `Store` 객체 생성
2. 기존 생성자에서 `OperatingHours.createDefault()`로 기본 운영시간 설정
3. 요청에 `operatingHours`가 있으면 요청값 검증 후 `store.updateOperatingHours(...)`로 덮어씀
4. 요청에 `operatingHours`가 없으면 기존 기본 운영시간 유지

이 방식은 사용자의 기존 요구인 “코드상 기본값을 유지해 null은 피하되, 매장 생성 때 운영시간을 넣을 수 있게 한다”를 만족한다.

### 4.5 운영시간 요청 검증

`StoreManagementServiceImpl`에 운영시간 배열 검증을 추가했다.

검증 기준:

- 운영시간 배열은 비어 있으면 안 된다.
- 요청이 들어온 경우 7개 요일이 모두 있어야 한다.
- 요일은 중복될 수 없다.
- 누락된 요일이 있으면 실패한다.
- 모든 요일이 휴무이면 실패한다.
- 휴무가 아닌 요일은 시작/종료 시간이 필요하다.
- 시작 시간과 종료 시간이 같거나 시작이 종료보다 늦으면 실패한다.

### 4.6 출퇴근 허용 범위 도메인 메서드 추가

수정 파일:

- `backend/src/main/java/com/rich/sodam/domain/Store.java`

기존 `isOpenAt(...)`은 “실제 운영 중인지”를 판단하는 의미로 유지했다. 대신 출퇴근 이상 판정에 사용할 별도 메서드를 추가했다.

```java
public boolean isWithinAttendanceWindowAt(LocalDateTime dateTime)
```

판정 기준:

- 해당 날짜의 운영시간 기준
- 오픈 1시간 전부터 정상
- 마감 1시간 후까지 정상

예:

운영시간 `09:00~18:00`이면:

- `07:59` -> false
- `08:00` -> true
- `09:00` -> true
- `18:00` -> true
- `19:00` -> true
- `19:01` -> false

마감 후 1시간이 자정을 넘는 경우도 처리한다.

예:

운영시간 `15:00~23:30`이면:

- 다음날 `00:30` -> true
- 다음날 `00:31` -> false

## 5. 시안 문서

추가 파일:

- `docs/store-hours-registration-mockup.html`

작업 전 사용자 확인용으로 운영시간 입력 UX 시안을 HTML로 만들었다.

시안에 포함된 내용:

- `매일 같음` / `요일별 설정` 토글
- 4자리 숫자 입력
- 입력 오류 문구
- 요일별 운영시간 행
- 휴무 체크
- 빠른 액션
- 출퇴근 허용 범위 안내

## 6. 테스트 및 검증 결과

### 6.1 FE 타입체크

실행 명령:

```powershell
npx.cmd tsc --noEmit
```

결과:

- 통과

### 6.2 FE 변경 파일 ESLint

실행 명령:

```powershell
npx.cmd eslint src/features/store/StoreRegistraionScreen.tsx src/features/store/services/storeService.ts
```

결과:

- 오류 0개
- 경고 10개

경고 내용:

- `storeService.ts`의 기존 `any` 사용 경고
- 이번 기능 동작을 막는 오류는 아님

전체 `npm run lint`는 작업 범위 밖 기존 `_archive/script.js` 등에서 오류가 있어 실패한다고 FE 에이전트가 보고했다.

### 6.3 BE 관련 테스트

처음에는 Gradle 캐시 jar 접근 권한 문제로 실패했다.

실패 원인:

```text
java.nio.file.AccessDeniedException:
backend\.gradle-user-home\caches\modules-2\files-2.1\io.grpc\grpc-protobuf\...
```

권한 밖 실행으로 동일 테스트를 재실행했다.

실행 명령:

```powershell
$env:GRADLE_USER_HOME = Join-Path (Get-Location) '.gradle-user-home'
.\gradlew.bat --no-daemon test --tests com.rich.sodam.service.StoreSettingsServiceTest --tests com.rich.sodam.domain.StoreAttendanceWindowTest
```

결과:

- BUILD SUCCESSFUL
- 테스트 통과

실행된 주요 테스트:

- `StoreSettingsServiceTest`
  - 운영시간 수정 라운드트립
  - 매장 생성 시 운영시간 반영
  - flexible time string 파싱
  - HHmm 검증 메시지 구분
  - 매장 기본 시급 변경 이력

- `StoreAttendanceWindowTest`
  - 오픈 1시간 전/마감 1시간 후 허용
  - 마감 후 허용 범위가 자정을 넘는 케이스

빌드 경고:

```text
PayrollCalculationRequestDto.java: @Builder will ignore the initializing expression entirely...
```

이 경고는 기존 코드의 Lombok builder 기본값 관련 경고이며, 이번 운영시간 작업과 직접 관련된 실패는 아니다.

## 7. 변경 파일 목록

### Backend

- `backend/src/main/java/com/rich/sodam/domain/Store.java`
- `backend/src/main/java/com/rich/sodam/dto/request/FlexibleLocalTimeDeserializer.java`
- `backend/src/main/java/com/rich/sodam/dto/request/OperatingHoursUpdateDto.java`
- `backend/src/main/java/com/rich/sodam/dto/request/StoreRegistrationDto.java`
- `backend/src/main/java/com/rich/sodam/service/StoreManagementServiceImpl.java`
- `backend/src/test/java/com/rich/sodam/domain/StoreAttendanceWindowTest.java`
- `backend/src/test/java/com/rich/sodam/service/StoreSettingsServiceTest.java`

### Frontend

- `frontend/src/features/store/StoreRegistraionScreen.tsx`
- `frontend/src/features/store/services/storeService.ts`

### Docs

- `docs/store-hours-registration-mockup.html`
- `docs/codex/store-registration-operating-hours-report.md`

## 8. 설계 판단

### 8.1 `isOpenAt`을 바꾸지 않은 이유

`Store.isOpenAt(...)`은 실제 매장이 운영 중인지 판단하는 의미를 갖고 있다. 여기에 전후 1시간 grace를 넣으면 “실제 영업 중”과 “출퇴근 허용 가능”의 의미가 섞인다.

따라서 출퇴근 이상 판정용 메서드를 별도로 추가했다.

- 실제 운영 중: `isOpenAt(...)`
- 출퇴근 정상 허용 범위: `isWithinAttendanceWindowAt(...)`

이렇게 분리하면 이후 대시보드의 영업 상태 표시와 출퇴근 이상 판정이 서로 영향을 주지 않는다.

### 8.2 FE가 7일 배열을 보내는 방식

`sameEveryday` 같은 축약 payload를 보내고 BE가 펼치는 방법도 가능하지만, 이번 작업에서는 FE가 최종 7일 배열을 보내도록 했다.

이유:

- BE 저장 모델이 이미 요일별 운영시간 구조다.
- `매일 같음`, `요일별 설정`, `휴무`를 모두 같은 payload로 표현할 수 있다.
- 3단계 확인 화면에서 실제 저장될 값을 그대로 보여줄 수 있다.
- 매장 생성과 운영시간 수정 API의 데이터 구조를 맞출 수 있다.

### 8.3 기본 운영시간 유지

요청에 운영시간이 없을 때는 기존 `OperatingHours.createDefault()`가 유지된다.

이유:

- 기존 API 호출자와의 호환성 유지
- DB/도메인에서 운영시간 null 방지
- 점진적 FE 배포 시 안전성 확보

## 9. 남은 리스크 및 후속 작업

### 9.1 야간 영업

현재 `OperatingHours.validateOperatingTime(...)`은 시작 시간이 종료 시간보다 늦은 케이스를 거부한다.

즉, `18:00~02:00` 같은 야간 영업은 아직 지원하지 않는다.

이번 사용자 요구에는 직접 포함되지 않았지만, 주류/야간 매장이 있다면 후속 작업으로 다음 정책이 필요하다.

- 마감 시간이 오픈 시간보다 빠르면 다음날 마감으로 해석할지
- 요일별 영업일 기준을 오픈일로 볼지 마감일로 볼지
- 출퇴근 허용 범위를 야간 영업에 맞게 계산할지

### 9.2 기존 운영시간 수정 화면과 UX 차이

신규 매장등록 화면은 `1000` 형식이고, 기존 운영시간 수정 화면은 `09:00` 형식이다.

BE는 둘 다 받을 수 있게 보강했지만, 사용자 경험 일관성을 위해 기존 운영시간 수정 화면도 추후 `1000` 입력 방식으로 맞추는 것이 좋다.

### 9.3 전체 lint

이번 변경 파일은 ESLint 오류가 없지만, 전체 lint는 기존 `_archive` 등 작업 범위 밖 파일로 실패한다.

후속으로 전체 lint 대상에서 archive를 제외하거나 기존 오류를 별도 정리하는 것이 좋다.

## 10. 최종 결과

이번 작업으로 매장등록은 다음 흐름이 되었다.

1. 기본정보 입력
2. 운영시간 입력
3. 확인 후 등록

운영시간은 사용자가 `1000`처럼 쉽게 입력할 수 있고, FE/BE 양쪽에서 검증된다. 저장 시에는 요일별 `HH:mm:ss` 형식으로 BE에 전달되고, BE는 운영시간이 있는 경우 해당 값을 저장한다. 운영시간이 없는 기존 요청은 기본 운영시간으로 계속 보호된다.

출퇴근 이상 판정에 사용할 수 있는 전후 1시간 허용 메서드도 도메인에 추가되어, 실제 영업 여부와 출퇴근 허용 범위를 분리해서 사용할 수 있게 되었다.
