# IA and Navigation Redesign

## 현재 문제 요약

- 앱 전체가 단일 Stack에 가깝게 평면 등록되어 있다.
- 하단 탭이 없어 반복 진입 화면으로 돌아가기 어렵다.
- `Home`은 임시 mock 화면이고, 실제 홈은 역할별 `MyPage` 화면에 흩어져 있다.
- `OwnerDashboard`와 `MasterMyPageScreen`이 사장 홈 역할을 중복한다.
- 온보딩 목적 선택이 이후 라우팅/가입에 반영되지 않는다.
- 라우트 오타와 미등록 라우트가 존재한다.

## 신규 IA 원칙

1. 역할별 홈을 먼저 확정한다.
2. 하단 탭은 역할별로 다르게 구성한다.
3. 상세 화면은 도메인별 Stack 안으로 넣는다.
4. `MyPage`는 홈이 아니라 계정/설정/지원의 역할만 담당한다.
5. 사용 목적 선택값은 가입/로그인 후 첫 화면에 반영한다.

## Root Flow

```text
Splash
  -> RoleStart
      -> OwnerStart
      -> EmployeeStart
      -> PersonalStart
  -> Auth
      -> Login
      -> Signup(role)
      -> PasswordReset
  -> AppShell(role)
```

## 사장/매니저 탭

```text
OwnerAppShell
  Tab 1 Dashboard
    OwnerHome
    MissingAttendanceCenter
    NotificationCenter

  Tab 2 Store
    StoreList
    StoreDetail
    StoreRegistration
    StoreEdit
    EmployeeDetail
    WageSettings

  Tab 3 Attendance
    AttendanceOverview
    AttendanceCalendar
    AttendanceCorrectionReview

  Tab 4 Payroll
    SalaryList
    SalaryDetail
    PayrollRun

  Tab 5 My
    OwnerMyPage
    Subscribe
    AccountSettings
    NotificationSettings
    QnA
    Referral
```

## 직원 탭

```text
EmployeeAppShell
  Tab 1 Home
    EmployeeHome
    JoinStoreByCode

  Tab 2 Attendance
    EmployeeAttendanceHome
    AttendanceCalendar
    AttendanceCorrectionRequest

  Tab 3 Salary
    EmployeeSalaryList
    SalaryDetail

  Tab 4 Info
    InfoList
    LaborInfoDetail
    TaxInfoDetail
    PolicyDetail
    TipsDetail

  Tab 5 My
    EmployeeMyPage
    TimeOffRequest
    AccountSettings
    NotificationSettings
```

## 개인 사용자 탭

```text
PersonalAppShell
  Tab 1 Home
    PersonalHome
    PersonalWorkplaceCreate

  Tab 2 Records
    PersonalAttendanceCalendar
    ManualRecordEdit

  Tab 3 Pay
    PersonalPaySummary

  Tab 4 Info
    InfoList

  Tab 5 My
    PersonalMyPage
    AccountSettings
```

## 라우트 정리 우선순위

| 이슈 | 처리 |
|---|---|
| `StoreRegistraion` 오타 | `StoreRegistration`으로 통일 |
| `StoreDetail` 파라미터 누락 | 항상 `storeId` 전달 |
| `LaborInfoDetail`의 `infoId/laborInfoId` 혼재 | `laborInfoId`로 통일 |
| `HomeStackParamList` 중복 정의 | `navigation/types.ts`를 단일 기준으로 지정 |
| 미등록 `AttendanceCheckIn/CheckOut` | 직원 홈 내부 상태 플로우 또는 등록된 상세 화면으로 정리 |
| `SalaryForm/SalaryPolicy` 미등록 | `PayrollRun/WageSettings`로 흡수하거나 등록 |

## 첫 진입 UX

### RoleStart

```text
상단: 소담 로고 + "오늘 가게 운영, 여기서 끝내세요"
카드 1: 사장님 - 출퇴근, 급여, 직원 관리
카드 2: 직원 - 출근, 급여명세, 정정 요청
카드 3: 개인 - 내 알바 시간 직접 기록
하단: 로그인 / 카카오로 계속 / 이메일 가입
```

선택한 역할은 Signup의 기본 선택값과 로그인 후 기본 홈으로 이어진다.
