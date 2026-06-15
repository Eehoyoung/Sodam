# Interaction Storyboards

작성일: 2026-05-25  
기준 화면: `prototypes/sodam-final-all-screens.html`  
목적: 버튼, 리스트, 카드, 권한 요청, 팝업, 바텀시트, 성공/실패 상태까지 빠짐없이 연결한다.

## 공통 인터랙션 원칙

- 화면의 1차 CTA는 하나만 강하게 보인다.
- CTA 탭 후 즉시 피드백을 준다: pressed scale, loading, 성공/실패 상태.
- 위험 액션은 바로 실행하지 않고 확인 바텀시트 또는 확인 모달을 거친다.
- 실패는 `Alert`만 띄우지 않는다. 화면 안에 다음 행동을 남긴다.
- 권한 요청은 OS 팝업 전에 “왜 필요한지”를 먼저 설명한다.
- 바텀시트는 하단 safe-area를 포함하고, 키보드가 올라와도 CTA가 가려지지 않아야 한다.

## Popup / Sheet Taxonomy

| Type | 사용처 | 형태 |
|---|---|---|
| ConfirmSheet | 삭제, 탈퇴, 지급 완료, 로그아웃 | 하단 바텀시트, 제목/설명/취소/확인 |
| ActionSheet | 직원 액션, 매장 공유, 급여 항목 액션 | 하단 바텀시트, 액션 리스트 |
| InputSheet | 시급 변경, 가감 조정, 정정 사유 | 하단 바텀시트, 입력 필드와 CTA |
| PermissionPrimer | 위치, 카메라, NFC | 전체 또는 바텀시트 설명 후 OS 권한 |
| SuccessState | 가입, 매장 등록, 정산 발급, 휴가 신청 | 완료 화면 또는 완료 카드 |
| ErrorState | 네트워크, 서버, 권한 거부, 유효성 실패 | 인라인 오류 + 재시도 CTA |
| LoadingState | 로그인, 정산 계산, 파일 생성 | 버튼 로딩 또는 섹션 skeleton |

## Global Micro Screens

### G-MS-001 Loading Overlay

**진입**
- 로그인
- 급여 계산
- 매장 등록
- 직원 가입
- 파일/PDF 생성

**화면**
- 반투명 overlay 또는 버튼 내부 spinner
- 문구: “확인하고 있어요”, “급여를 계산하고 있어요”
- 2초 이상 지속 시 보조 문구 표시

**종료**
- 성공: 다음 화면 또는 완료 상태
- 실패: ErrorState 또는 해당 화면 인라인 오류

### G-MS-002 Network Error

**트리거**
- API timeout
- 오프라인
- 서버 5xx

**화면**
- 제목: “잠시 연결이 불안정해요”
- 설명: “기록은 사라지지 않습니다. 네트워크가 복구되면 다시 불러올게요.”
- CTA: `다시 시도`
- 보조 CTA: `고객지원 보기`

### G-MS-003 Permission Primer

**트리거**
- 위치 권한 필요
- 카메라 QR 필요
- NFC 비활성/미지원

**화면**
- 제목: “위치 권한이 필요해요”
- 설명: 기능에 필요한 이유를 1문장으로 설명
- CTA: `권한 켜기`
- 보조 CTA: 기능별 대체 행동

## Screen-by-Screen Interaction Map

### 00 Splash

| Trigger | Destination |
|---|---|
| app ready + first launch | `01 RoleStart` |
| app ready + authenticated | role-based home: `08 OwnerHome`, `21 EmployeeAttendanceHome`, `45 PersonalHome`, `46 ManagerHome` |
| app init error | `48 ErrorState` |

### 01 RoleStart

| Trigger | Destination / Popup |
|---|---|
| `사장님` 카드 탭 | 카드 active, CTA `사장님으로 시작하기` |
| `직원` 카드 탭 | 카드 active, CTA `직원으로 시작하기` |
| `개인 기록` 카드 탭 | 카드 active, CTA `개인 기록 시작하기` |
| primary CTA | `05 Signup` with selected role |
| `이미 계정이 있어요` | `04 Login` |
| back gesture | app exit confirmation 없음 |

### 02 WelcomeMain

| Trigger | Destination / Popup |
|---|---|
| `무료로 시작하기` | `01 RoleStart` 또는 role 미선택 시 role selection |
| `이미 계정이 있어요` | `04 Login` |
| `로그인` header action | `04 Login` |
| feature card tap | `03 OnboardingCarousel` 해당 slide |

### 03 OnboardingCarousel

| Trigger | Destination / Popup |
|---|---|
| `다음` | next slide |
| final slide `시작하기` | `01 RoleStart` |
| skip | `01 RoleStart` |
| swipe | next/prev slide |

### 04 Login

| Trigger | Destination / Popup |
|---|---|
| `로그인` with valid input | `G-MS-001 Loading` -> role-based home |
| `로그인` invalid input | inline validation under fields |
| auth fail | inline error card: “이메일 또는 비밀번호를 확인해 주세요” |
| `카카오로 계속` | `07 KakaoLogin` |
| `비밀번호 찾기` | `06 PasswordReset` |
| `회원가입` | `01 RoleStart` |

### 05 Signup

| Trigger | Destination / Popup |
|---|---|
| role segment tap | update form copy and required next step |
| `필수 약관 동의` | `SHEET-TERMS-001 TermsSheet` |
| `다음` step 1 valid | Signup Step 2 profile/store-code |
| `다음` invalid | inline validation |
| final submit owner | `12 StoreRegistration` |
| final submit employee | `27 JoinStoreByCode` |
| final submit personal | `45 PersonalHome` |

### SHEET-TERMS-001 TermsSheet

**구성**
- 약관 요약 리스트
- 전체 동의 checkbox
- 개별 보기 링크
- CTA `동의하고 계속`

**연결**
- 개별 약관 보기: legal webview 또는 약관 상세 sheet
- 완료: Signup으로 복귀, 동의 상태 checked

### 06 PasswordReset

| Trigger | Destination / Popup |
|---|---|
| `재설정 메일 보내기` valid | `SUCCESS-PASSWORD-001` |
| invalid email | inline validation |
| email not found | neutral success copy 유지: 계정 존재 여부 노출 금지 |

### SUCCESS-PASSWORD-001

**화면**
- 제목: “메일을 보냈어요”
- 설명: “받은 편지함에서 재설정 링크를 확인해 주세요.”
- CTA: `로그인으로 돌아가기`

### 07 KakaoLogin

| Trigger | Destination / Popup |
|---|---|
| `카카오 동의 계속하기` | external Kakao consent |
| consent success existing user | role-based home |
| consent success new user | `05 Signup` with kakao profile prefill |
| cancel | `04 Login` |
| fail | `48 ErrorState` with retry |

### 08 OwnerHome

| Trigger | Destination / Popup |
|---|---|
| store title/dropdown | `SHEET-STORE-SWITCHER-001` |
| notification icon | `38 NotificationCenter` |
| `이상 출퇴근 확인` | `25 MissingAttendanceCenter` |
| metric `출근 4/5` | `19 AttendanceOverview` filtered today |
| metric `예상급여` | `28 SalaryList` current month |
| employee row tap | `17 EmployeeDetail` |
| `이번 달 급여` card tap | `28 SalaryList` |
| quick `정산` | `30 PayrollRun` |
| quick `직원` | `13 StoreDetail Console` employee section |
| quick `위치` | `14 StoreEdit` location section |

### SHEET-STORE-SWITCHER-001

**구성**
- 매장 리스트
- 현재 선택 표시
- `새 매장 등록`

**연결**
- 매장 선택: OwnerHome refresh
- 새 매장 등록: `12 StoreRegistration`

### 09 HomeScreen Replacement

| Trigger | Destination |
|---|---|
| `사장 홈` | `08 OwnerHome` |
| `직원 홈` | `21 EmployeeAttendanceHome` |
| `개인 기록장` | `45 PersonalHome` |

### 10 OwnerDashboard Detail

| Trigger | Destination |
|---|---|
| `정산` | `30 PayrollRun` |
| `직원` | `13 StoreDetail Console` |
| `위치` | `14 StoreEdit` |
| insight card tap | `32 InfoList` or related detail |

### 11 StoreList

| Trigger | Destination / Popup |
|---|---|
| store row tap | `13 StoreDetail Console` |
| `새 매장 등록` | `12 StoreRegistration` |
| row overflow | `SHEET-STORE-ACTIONS-001` |

### SHEET-STORE-ACTIONS-001

Actions:
- 매장 정보 수정 -> `14 StoreEdit`
- 직원 초대 코드 공유 -> native share sheet
- 시급 정책 -> `18 WageSettings`
- 매장 비활성화 -> `CONFIRM-STORE-DISABLE-001`

### 12 StoreRegistration

| Trigger | Destination / Popup |
|---|---|
| `매장 주소 검색` | `SHEET-ADDRESS-SEARCH-001` |
| `인증 반경 조정` | `SHEET-RADIUS-001` |
| `기본 시급` | numeric input sheet |
| `다음: 확인하기` | Step 3 confirmation |
| final `매장 등록` | `SUCCESS-STORE-001` |
| fail duplicate business no. | inline error |

### SHEET-ADDRESS-SEARCH-001

**구성**
- 검색 input
- 최근 검색/검색 결과
- 지도 preview
- CTA `이 주소로 설정`

### SHEET-RADIUS-001

**구성**
- 50m / 80m 추천 / 120m segmented control
- 지도 원형 반경 preview
- 안내: “반경이 너무 좁으면 출근 실패가 늘 수 있어요.”

### SUCCESS-STORE-001

**화면**
- “매장 등록이 끝났어요”
- 초대 코드 표시
- CTA: `직원 초대하기`
- 보조 CTA: `대시보드로 가기`

### 13 StoreDetail Console

| Trigger | Destination / Popup |
|---|---|
| `편집` | `14 StoreEdit` |
| `초대 코드 복사` | toast: “초대 코드를 복사했어요” |
| `공유` | native share sheet |
| employee row | `17 EmployeeDetail` |
| `위치` quick | `14 StoreEdit` location focus |
| `시급` quick | `18 WageSettings` |
| `정산` quick | `30 PayrollRun` with storeId |
| `직원 추가` | share invite sheet |

### 14 StoreEdit

| Trigger | Destination / Popup |
|---|---|
| address field | `SHEET-ADDRESS-SEARCH-001` |
| location changed + save | `CONFIRM-LOCATION-CHANGE-001` |
| `변경사항 저장` | loading -> StoreDetail |
| destructive `매장 삭제` if added | `CONFIRM-STORE-DELETE-001` |

### CONFIRM-LOCATION-CHANGE-001

**내용**
- “위치가 바뀌면 직원 출퇴근 가능 반경도 바뀝니다.”
- CTA: `변경 저장`
- 취소: `다시 확인`

### 15 WorkplaceList

| Trigger | Destination |
|---|---|
| workplace row | `16 WorkplaceDetail` |
| `근무지 추가` | Personal workplace create sheet |
| employee-linked workplace | `21 EmployeeAttendanceHome` |

### 16 WorkplaceDetail

| Trigger | Destination / Popup |
|---|---|
| `편집` | personal workplace edit sheet |
| `최근 기록` | personal record detail |
| `월간 요약` | personal pay summary |
| `근무지 삭제` | ConfirmSheet |

### 17 EmployeeDetail

| Trigger | Destination / Popup |
|---|---|
| `메모` | `SHEET-EMPLOYEE-MEMO-001` |
| `시급 변경` | `SHEET-WAGE-EDIT-001` |
| attendance list item | `23 AttendanceCalendar` selected date |
| salary tab | `29 SalaryDetail` employee month |
| vacation tab | timeoff history sheet |
| deactivate employee | `CONFIRM-EMPLOYEE-DISABLE-001` |

### SHEET-EMPLOYEE-MEMO-001

Fields:
- 사장 전용 메모
- 태그: 마감 가능, 주말 가능, 교육 필요
- CTA `저장`

### SHEET-WAGE-EDIT-001

Fields:
- 적용 시급
- 적용 시작일
- 변경 사유

Validation:
- 최저시급 이하 경고
- 적용일이 과거면 기존 급여 재계산 영향 안내

### 18 WageSettings

| Trigger | Destination / Popup |
|---|---|
| `직원별 시급 조정` | `SHEET-WAGE-EDIT-001` |
| employee wage row | `SHEET-WAGE-EDIT-001` prefilled |
| history row | wage history detail sheet |
| save | success toast |

### 19 AttendanceOverview

| Trigger | Destination / Popup |
|---|---|
| `누락 기록 정리` | `25 MissingAttendanceCenter` |
| segment tap | refresh list |
| employee row | attendance detail sheet |
| filter | `SHEET-ATTENDANCE-FILTER-001` |

### SHEET-ATTENDANCE-FILTER-001

Controls:
- 날짜 범위
- 상태: 정상/미출근/누락/정정대기
- 직원 선택
- CTA `필터 적용`

### 20 AttendanceScreen Advanced

| Trigger | Destination / Popup |
|---|---|
| segment `기본/위치/NFC` | 인증 방식 변경 |
| `NFC로 출근하기` | `MODAL-NFC-SCAN-001` |
| GPS permission missing | `49 PermissionState` |
| NFC unsupported | `MODAL-NFC-UNSUPPORTED-001` |

### MODAL-NFC-SCAN-001

**화면**
- 전체 modal
- NFC 아이콘/애니메이션
- 문구: “태그를 휴대폰 뒷면에 가까이 대세요”
- CTA: `취소`

**결과**
- success: punch success sheet
- fail: retry / GPS로 출근

### 21 EmployeeAttendanceHome

| Trigger | Destination / Popup |
|---|---|
| central `출근하기` | permission check -> punch loading -> `22 EmployeeWorking` |
| no store | `27 JoinStoreByCode` |
| `급여명세` | employee salary list or `29 SalaryDetail` latest |
| `근무기록` | `23 AttendanceCalendar` |
| `매장코드` | `27 JoinStoreByCode` |
| store label tap | store switcher sheet |

### PUNCH-RESULT-001

**성공**
- “출근 처리됐어요”
- 출근 시간, 매장명, 적용 시급
- CTA: `근무 시작`

**실패**
- 반경 밖: `49 PermissionState` style with `정정 요청`
- 네트워크: offline queue 안내
- 중복 출근: 현재 근무중 화면으로 이동

### 22 EmployeeWorking

| Trigger | Destination / Popup |
|---|---|
| `퇴근하기` | `CONFIRM-CHECKOUT-001` |
| timer tap | today work detail sheet |
| expected pay tap | salary calculation preview sheet |

### CONFIRM-CHECKOUT-001

**내용**
- 오늘 근무시간
- 예상 일급
- 휴게시간 누락 여부
- CTA: `퇴근 처리`
- 보조: `휴게시간 추가`

### 23 AttendanceCalendar

| Trigger | Destination / Popup |
|---|---|
| month selector | month picker sheet |
| date tap | selected day detail card |
| `정정 요청` | `24 CorrectionRequest` with date |
| warning dot tap | same date detail + reason highlighted |

### 24 CorrectionRequest

| Trigger | Destination / Popup |
|---|---|
| time field | time picker sheet |
| reason empty + submit | inline validation |
| `정정 요청 보내기` | loading -> `SUCCESS-CORRECTION-001` |

### SUCCESS-CORRECTION-001

**화면**
- “정정 요청을 보냈어요”
- 상태: 사장 승인 대기
- CTA: `근무 기록으로 돌아가기`

### 25 MissingAttendanceCenter

| Trigger | Destination / Popup |
|---|---|
| record row | correction review detail sheet |
| `선택 기록 처리` | action sheet: 수동 수정/직원에게 요청/무시 |
| manual edit | time input sheet |
| ignore | ConfirmSheet |

### 26 TimeOffRequest

| Trigger | Destination / Popup |
|---|---|
| start/end date | date picker sheet |
| reason empty + submit | inline validation |
| `휴가 신청하기` | loading -> `SUCCESS-TIMEOFF-001` |
| recent request row | timeoff detail sheet |

### SUCCESS-TIMEOFF-001

**화면**
- “휴가 신청을 보냈어요”
- 승인 결과 알림 안내
- CTA: `내 정보로 돌아가기`

### 27 JoinStoreByCode

| Trigger | Destination / Popup |
|---|---|
| code input | auto-format uppercase |
| `QR` | camera permission -> QR scanner modal |
| `매장 가입하기` valid | loading -> `SUCCESS-JOIN-STORE-001` |
| invalid code | inline error |
| already joined | existing store sheet |

### SUCCESS-JOIN-STORE-001

**화면**
- 매장명
- 적용 시급
- 사장 승인 필요 여부
- CTA: `출근 화면으로 가기`

### 28 SalaryList

| Trigger | Destination / Popup |
|---|---|
| `5월` selector | month picker sheet |
| employee payroll row | `29 SalaryDetail` |
| `급여 정산 시작` | `30 PayrollRun` |
| `과거 내역 보기` | filter sheet |
| status badge tap | status explanation sheet |

### 29 SalaryDetail

| Trigger | Destination / Popup |
|---|---|
| `PDF` | PDF preview/generation sheet |
| `지급 완료 처리` | `CONFIRM-PAY-PAID-001` |
| `계산 근거 보기` | calculation source sheet |
| breakdown row | source attendance list |

### CONFIRM-PAY-PAID-001

**내용**
- “실제 지급을 완료했나요?”
- 지급일 선택
- CTA: `지급 완료로 변경`

### 30 PayrollRun

| Trigger | Destination / Popup |
|---|---|
| step 1 store/period | store picker / date range picker |
| missing attendance card | `25 MissingAttendanceCenter` |
| employee preview row | payroll calculation detail sheet |
| `보기` badge | same detail sheet |
| `명세서 발급하기` | `CONFIRM-ISSUE-PAYROLL-001` |

### CONFIRM-ISSUE-PAYROLL-001

**내용**
- 총 지급 예정
- 직원 수
- 직원 알림 발송 여부 toggle
- CTA: `명세서 발급`

**결과**
- success: `SUCCESS-PAYROLL-ISSUE-001`
- fail: `48 ErrorState`

### SUCCESS-PAYROLL-ISSUE-001

**화면**
- “명세서 발급이 끝났어요”
- 직원에게 알림 발송 완료
- CTA: `급여 목록으로`

### 31 Subscribe

| Trigger | Destination / Popup |
|---|---|
| `결제 수단 관리` | billing method sheet |
| plan row 무료/비즈니스 | plan detail sheet |
| 환급형 준비중 | waitlist sheet |
| cancel subscription | `CONFIRM-SUBSCRIPTION-CANCEL-001` |

### 32 InfoList

| Trigger | Destination |
|---|---|
| Labor card | `33 LaborInfoDetail` |
| Tax card | `35 TaxInfoDetail` |
| Policy card | `34 PolicyDetail` |
| Tip card | `36 TipsDetail` |
| search | search result state |

### 33-36 Info Detail Screens

| Trigger | Destination / Popup |
|---|---|
| `저장` | toast: “저장했어요” |
| `공유` | native share sheet |
| related card | target detail screen |
| external application link | external browser confirm |

### 37 QnA

| Trigger | Destination / Popup |
|---|---|
| search field | search result |
| question row | answer detail sheet |
| `글쓰기` | qna compose sheet |
| submit | success toast |

### 38 NotificationCenter

| Trigger | Destination |
|---|---|
| attendance notification | related attendance screen |
| payroll notification | `28 SalaryList` or `30 PayrollRun` |
| correction notification | `25 MissingAttendanceCenter` |
| `설정` | `40 NotificationSettings` |

### 39 Settings

| Trigger | Destination |
|---|---|
| 알림 | `40 NotificationSettings` |
| 화면 표시 | display settings sheet |
| 보안 | security/session sheet |
| 고객지원 | `37 QnA` |

### 40 NotificationSettings

| Trigger | Destination / Popup |
|---|---|
| toggle tap | immediate update + toast |
| `저장` | persist settings -> Settings |
| marketing toggle on | marketing consent sheet |

### 41 MyPage

| Trigger | Destination / Popup |
|---|---|
| `편집` | `43 Profile` |
| 구독/결제 row | `31 Subscribe` |
| 알림 설정 row | `40 NotificationSettings` |
| 계정 설정 row | `42 AccountSettings` |
| 문의하기 row | `37 QnA` |
| 약관/개인정보 | legal webview |
| `로그아웃` | `CONFIRM-LOGOUT-001` |

### 42 AccountSettings

| Trigger | Destination / Popup |
|---|---|
| password field | password change sheet |
| `변경사항 저장` | loading -> toast |
| `회원 탈퇴` | `CONFIRM-ACCOUNT-DELETE-001` |

### CONFIRM-ACCOUNT-DELETE-001

**단계**
1. 탈퇴 영향 안내
2. 확인 문구 입력
3. 최종 CTA `탈퇴하기`

### 43 Profile

| Trigger | Destination / Popup |
|---|---|
| profile image | image picker sheet |
| `프로필 저장` | loading -> MyPage |
| invalid phone | inline validation |

### 44 Referral

| Trigger | Destination / Popup |
|---|---|
| `추천 링크 공유` | native share sheet |
| code card tap | copy toast |
| reward info tap | reward terms sheet |

### 45 PersonalHome

| Trigger | Destination / Popup |
|---|---|
| `출근` | personal punch start sheet |
| `휴게` | break timer sheet |
| `퇴근` | personal checkout confirmation |
| record row | personal record edit sheet |
| `수동 기록 추가` | manual record sheet |
| `추가` header | workplace create sheet |

### 46 ManagerHome

| Trigger | Destination |
|---|---|
| 오전/오후 파트 row | attendance filtered list |
| 정정 요청 row | correction review |
| 알림 | NotificationCenter |

### 47 EmptyState

| Trigger | Destination |
|---|---|
| `초대 코드 만들기` | StoreDetail invite code area or share sheet |

### 48 ErrorState

| Trigger | Destination |
|---|---|
| `다시 시도` | retry previous request |
| `고객지원 보기` | `37 QnA` |

### 49 PermissionState

| Trigger | Destination / Popup |
|---|---|
| `권한 켜기` | OS settings or OS permission dialog |
| `사장님께 수동 요청` | `24 CorrectionRequest` or manual request sheet |

### 50 LoadingState

| Trigger | Destination |
|---|---|
| success | previous intended target |
| timeout | `48 ErrorState` |

## Hidden / Micro Screen Checklist

아래는 HTML의 독립 목업으로는 크게 보이지 않지만 구현 시 별도 상태로 반드시 설계해야 하는 화면이다.

| ID | Micro Screen | Parent |
|---|---|---|
| MS-001 | Store Switcher Sheet | OwnerHome |
| MS-002 | Address Search Sheet | StoreRegistration / StoreEdit |
| MS-003 | Radius Selector Sheet | StoreRegistration / StoreEdit |
| MS-004 | Invite Share Sheet | StoreDetail |
| MS-005 | Employee Action Sheet | EmployeeDetail |
| MS-006 | Wage Edit Sheet | EmployeeDetail / WageSettings |
| MS-007 | Attendance Filter Sheet | AttendanceOverview |
| MS-008 | NFC Scan Modal | Attendance Advanced |
| MS-009 | Checkout Confirm Sheet | EmployeeWorking |
| MS-010 | Time Picker Sheet | CorrectionRequest |
| MS-011 | Date Range Picker Sheet | TimeOff / PayrollRun |
| MS-012 | Payroll Calculation Detail Sheet | PayrollRun / SalaryDetail |
| MS-013 | Payroll Issue Confirm Sheet | PayrollRun |
| MS-014 | PDF Preview Sheet | SalaryDetail |
| MS-015 | Billing Method Sheet | Subscribe |
| MS-016 | Plan Detail Sheet | Subscribe |
| MS-017 | QnA Compose Sheet | QnA |
| MS-018 | Legal Webview | MyPage / Signup |
| MS-019 | Logout Confirm Sheet | MyPage |
| MS-020 | Account Delete Multi-step | AccountSettings |
| MS-021 | Image Picker Sheet | Profile |
| MS-022 | Manual Record Sheet | PersonalHome |
| MS-023 | Break Timer Sheet | PersonalHome |
| MS-024 | Personal Record Edit Sheet | PersonalHome |

## Required Toasts

| Trigger | Toast |
|---|---|
| 초대 코드 복사 | “초대 코드를 복사했어요” |
| 프로필 저장 | “프로필을 저장했어요” |
| 알림 설정 변경 | “알림 설정을 바꿨어요” |
| 정보 글 저장 | “나중에 볼 수 있게 저장했어요” |
| 추천 코드 복사 | “추천 코드를 복사했어요” |
| 시급 저장 | “시급 변경을 저장했어요” |
| 매장 정보 저장 | “매장 정보를 저장했어요” |
| 로그아웃 완료 | “로그아웃했어요” |

## Implementation Handoff Rule

구현자는 화면 하나를 만들 때 다음 항목을 함께 구현해야 완료로 본다.

- 기본 화면
- 로딩
- 빈 상태
- 오류 상태
- 권한 상태, 해당 시
- 1차 CTA 성공/실패
- 뒤로가기/취소
- 관련 바텀시트 또는 모달
- 320px 폭에서 텍스트 깨짐 없음
- 하단 CTA safe-area 가림 없음
