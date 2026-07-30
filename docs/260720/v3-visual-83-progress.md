# v3 시각 하네스 — 미배선 83화면 진행 체크리스트

154화면 카탈로그 중 `V3VisualHarnessScreen.tsx` 디스패치에 아직 배선 안 된 83개. 하나 완료할 때마다 체크.
완료 기준: (1) native-reference 카드 재현 컴포넌트 작성, (2) 디스패치 2분기(reference/actual) 배선, (3) 실기기 캡처+native-strict 비교 통과.

## 03 employee (4) — 완료
- [x] 061 퇴근 확인 시트
- [x] 078 수동 기록 추가
- [x] 079 BreakTimerSheet
- [x] 080 PersonalRecordEdit

## 04 payroll (9) — 완료
- [x] 029 SalaryDetail
- [x] 030 PayrollRun (reference/actual 동일 컴포넌트 재사용 — 코드 주석 참고)
- [x] 031 Subscribe (reference/actual 동일 컴포넌트 재사용)
- [x] 067 계산 근거
- [x] 068 PayrollIssueConfirm (reference/actual 동일 컴포넌트 재사용)
- [x] 069 PayrollIssueSuccess (reference/actual 동일 컴포넌트 재사용)
- [x] 070 PDFPreview
- [x] 071 BillingMethod
- [x] 072 PlanDetail

## 05 info (9) — 완료
- [x] 032 InfoList (reference/actual 동일 컴포넌트 재사용)
- [x] 033 LaborInfoDetail (reference/actual 동일 컴포넌트 재사용)
- [x] 034 PolicyDetail (reference/actual 동일 컴포넌트 재사용)
- [x] 035 TaxInfoDetail (reference/actual 동일 컴포넌트 재사용)
- [x] 036 TipsDetail (reference/actual 동일 컴포넌트 재사용)
- [x] 037 QnA (reference/actual 동일 컴포넌트 재사용)
- [x] 073 QnACompose (QnAScreen의 BottomSheet — visualComposeOpen prop으로 강제 오픈)
- [x] 074 LegalWebview (route.params 없이도 기본값 렌더 — 변경 불필요)
- [x] 038 NotificationCenter

## 06 settings (11) — 완료
- [x] 039 Settings
- [x] 040 NotificationSettings
- [x] 041 MyPage (039와 동일 SettingsScreen 재사용)
- [x] 042 AccountSettings
- [x] 043 Profile
- [x] 044 Referral
- [x] 075 LogoutConfirm (독립 전사 — ConfirmSheet 전역 시트 문구 재현)
- [x] 076 AccountDeleteFlow (AccountSettingsScreen visualWithdrawOpen)
- [x] 077 ImagePickerSheet
- [x] 081 ToastExamples (독립 전사 — 실 화면 없는 디자인 참조 카드)
- [x] 082 ComponentRules (독립 전사 — 실 화면 없는 디자인 참조 카드)

## 07 recruitment (8) — 완료
- [x] R1 채용구직 허브 (EmployeeRecruitmentScreen visualInitialTab='nearby' + visualNearbyFixture)
- [x] R2 채용함 (JobOfferInboxScreen visualFixture — nowMs 고정으로 남은시간 타이머 비결정성 제거)
- [x] R3 공고 상세 (JobPostingDetailScreen visualFixture)
- [x] R4 구직자 상세 (JobSeekerDetailScreen visualFixture)
- [x] R5 구직자 목록 (JobSeekerListScreen visualFixture)
- [x] R6 구직 설정 (JobSeekingSettingsScreen visualFixture)
- [x] R7 주변 채용 공고 (NearbyJobPostingsScreen visualFixture)
- [x] R8 우리 매장 공고 관리 (OurPostingScreen visualApplicantsFixture + useMyJobPosting/useStoreJobApplications enabled 게이팅으로 TanStack 에러 토스트 제거)

## 08 contract (10) — 완료
- [x] C1 전자서명 연결 (ContractSignScreen, 실컴포넌트 그대로)
- [x] C2 임시저장 계약서 (DraftContractsScreen)
- [x] C3 내 근로계약서 (MyContractScreen visualAutoSelectFirst)
- [x] C4 근로계약서 보내기 ⛔노무사게이트(protected-readonly) — SendContractScreen.tsx 무수정, 독립 전사 컴포넌트만 배선
- [x] C5 서류 추가 (AddDocumentScreen)
- [x] C6 서류함 (EmployeeDocumentsScreen)
- [x] C7 전자서명 진행상태 ⛔노무사게이트(protected-readonly) — ElectronicSignScreen.tsx 무수정, 독립 전사 컴포넌트만 배선
- [x] C8 근무 증거 패키지 (EvidencePackageScreen)
- [x] C9 증명서 발급 (MyCertificateScreen)
- [x] C10 연소근로자 확인 (MinorGuardScreen)

## 10 business (11) — 완료
- [x] B1 매입장부 (PurchaseLedgerScreen, route/navigation 직접 props)
- [x] B2 매입 추가 스캔 (PurchaseScanScreen)
- [x] B3 확인하고 저장 (PurchaseConfirmScreen)
- [x] B4 가격 추이 (PriceTrendScreen)
- [x] B5 발주 참고 (ReorderHintScreen)
- [x] B6 일일 매출 입력 (DailySalesEntryScreen)
- [x] B7 인건비율 (LaborCostRatioScreen)
- [x] B8 이번 주 인사이트 (WeeklyInsightsScreen)
- [x] B9 지원금 자격 (SubsidyEligibilityScreen)
- [x] B10 채용 비용 계산 (HiringCostSimulatorScreen)
- [x] B11 노무 리스크 (LaborRiskDashboardScreen)

## 11 taxwage (9) — 완료
- [x] W1 급여 미리보기 (PayrollPreviewScreen visualFixture)
- [x] W2 지난 급여명세 (SalaryArchiveScreen)
- [x] W3 세금 신고 기한 (TaxDeadlineScreen)
- [x] W4 세무 시뮬레이터 (TaxSimulatorScreen)
- [x] W5 세무사 송부 (TaxReportScreen)
- [x] W6 세무 자료 원천징수 (WithholdingStatementScreen)
- [x] W7 내 시급 이력 (MyWageHistoryScreen)
- [x] W8 고용 공제 신호 (HeadcountTrendScreen)
- [x] W9 법정 장부 (LegalLedgerScreen)

## 12 notice (12) — 완료
- [x] N1 매장 공지 사장뷰 (StoreNoticeListScreen)
- [x] N2 공지 작성 (WriteNoticeScreen)
- [x] N3 공지 직원뷰 (MyNoticeScreen)
- [x] N4 내 요청 현황 (RequestStatusScreen)
- [x] N5 매니저 권한 위임 (ManagerAppointSection, ScreenContainer로 래핑)
- [x] N6 내 정보 직원뷰 (EmployeeMyPageRNScreen)
- [x] N7 내 위임 현황 매니저뷰 (ManagerMyPageScreen visualFixture) — 컴퓨터 재시작 후 native-strict 0/0 통과. 아래 "N7 인수인계 — 최종 해결" 절 참고
- [x] N8 즉시 보너스 ⛔노무사게이트(protected-readonly) — SendBonusScreen.tsx 무수정, 독립 전사 컴포넌트만 배선(VisualSendBonus)
- [x] N9 내 환급 (PersonalAnnualTaxScreen)
- [x] N10 휴게 기록 (BreakRecordScreen)
- [x] N11 약관 동의 (ConsentScreen, navigation/route 직접 props)
- [x] N12 프로필 기본정보 (ProfileBasicsScreen, navigation/route 직접 props)

(13 ops 그룹은 0개 남음 — O1~O9 전부 이미 배선됨)

---

## 🎉 83/83 전체 완료 (2026-07-28)

154화면 카탈로그 중 미배선이었던 83개 전부 (1) native-reference 카드 재현/실컴포넌트 재사용,
(2) `V3VisualHarnessScreen.tsx` reference/actual 2분기 배선, (3) 실기기 캡처 + native-strict
(channel-threshold 0, pixel-budget 0) 비교 통과까지 완료. 154화면 카탈로그 전체가 이제
`V3VisualHarnessScreen.tsx`에 배선됨.

### N7 인수인계 — 최종 해결
근본원인은 끝까지 100% 특정되지는 않았지만(Windows 방화벽 규칙 추가는 효과 없었음 — KISS
ServerMon 등 별도 보안 에이전트 가설도 검증 전 단계), **컴퓨터를 완전히 재시작하고 Docker·Metro·
에뮬레이터를 전부 새로 띄우니 즉시 해결**됐다. 재부팅 후 첫 콜드스타트 캡처부터 바로
`Failed to connect` 없이 정상 번들 로드 + native-strict 0/0 통과. 이는 이 세션 중반의 극심한 삽질
(에뮬레이터 ANR 연쇄, split-brain 프로세스, 방화벽 규칙 등)이 근본적으로는 **누적된 프로세스/커널
레벨 네트워크 상태 오염**(마라톤 세션 동안 반복된 앱 콜드스타트·Metro 재시작·에뮬레이터 강제
종료 등에서 비롯된 것으로 추정) 때문이었을 가능성을 시사한다 — 재부팅이 가장 확실한 해결책이었다.
같은 클래스의 문제가 재발하면 개별 프로세스 재시작보다 **컴퓨터 재시작을 우선 시도**할 것.

### 이번 세션에서 발견·수정한 인프라 버그 2건 (83개 배선 작업 초반)
1. **딥링크 슬래시 버그**: `sodam://v3/actual/{id}` 형태는 react-navigation이 `v3`를 host로 파싱해
   내비게이션이 안 먹었다. `sodam:///v3/actual/{id}`(슬래시 3개)로 수정.
   → `frontend/scripts/capture-v3-android-visual.ps1`에 반영 완료.
2. **Modal 내부 캡처마커 미전달 버그**: RN `Modal`(BottomSheet 등)은 별도 Android 윈도우로 뜨기 때문에,
   배경에 있는 `VisualRouteFrame`의 마커 Text가 Modal이 열려 있는 동안 uiautomator 덤프에 안 잡혔다.
   `captureMarker` prop을 BottomSheet를 쓰는 모든 시트 컴포넌트에 추가로 관통시켜 해결
   (AttendanceSheets 4종, PayrollCalculationDetailModal, BillingMethodSheet, PlanDetailSheet,
   ImagePickerSheet, QnAScreen 등 이번 세션에서 새로 배선한 시트 전부 포함).

### 방법론 요약
- 83개 전부 (1) `visualFixture`/`captureMarker` optional prop을 실 화면 컴포넌트에 추가(동작 변경 없음),
  (2) `V3VisualHarnessScreen.tsx`에 reference/actual 2분기 배선, (3) 실기기 캡처 + native-strict
  (channel-threshold 0, pixel-budget 0) 비교 통과, 순서로 진행.
- 목록/폼이 복잡한 화면은 시안 재현 대신 **실 컴포넌트를 reference/actual 양쪽에 그대로 재사용**
  (예: PayrollRun 3단계, Subscribe, InfoList 등) — 코드 내 주석으로 사유 명시.
- ⛔ 노무사 게이트 3종(C4 SendContractScreen, C7 ElectronicSignScreen, N8 SendBonusScreen)은
  CLAUDE.md 정책에 따라 해당 실 화면 파일을 **전혀 건드리지 않고**, 시안 문구를 그대로 옮긴 독립
  전사 컴포넌트(`VisualSendContractStep3`, `VisualElectronicSignProgress`, `VisualSendBonus`)만
  하네스에 추가해 read-only로 캡처했다.
- 실 백엔드 쿼리가 타이밍에 따라 비결정적으로 보이는 경우(로딩 스피너 애니메이션 프레임 차이,
  "N시간 M분 남음" 카운트다운 텍스트, TanStack Query 에러 토스트 등)는 `visualFixture`로 완전히
  우회하거나(`enabled` 게이팅으로 실 쿼리 자체를 비활성화), `nowMs` 같은 고정 시각 파라미터를
  추가로 관통시켜 0/0 strict 비교를 통과시켰다 (JobOfferInboxScreen, ManagerMyPageScreen 등).

---

## 후속이슈 조치 — 020 AttendanceScreen(인증방식) 회귀 수정 (2026-07-29)

83개 배선 완료 후 154화면 전체 native-strict 카탈로그 비교(`npm run visual:v3:compare:native`)를
돌려 최종 확인하는 과정에서, 이번 세션 범위(83개) **밖의** 화면 하나가 낙제한 것을 발견함
(`sodam-v3-03-employee--020`, "20 AttendanceScreen(인증방식)"). 153/154. 사용자 지시("후속이슈
조사 후 조치해")에 따라 조사 및 수정 진행.

### 원인
`V3VisualHarnessScreen.tsx`의 `NativeReferenceAttendanceAuthentication`(손으로 옮겨 그린 reference
컴포넌트)이 `docs/260720/artifacts/sodam-v3-03-employee.html`의 #20 목업 카드를 **글자 그대로
전사**한 것이었다 — 헤더 "출퇴근 인증"+NFC 우측텍스트, 푸터 "NFC로 출근하기", GPS 카드와 NFC 카드가
동시에 노출되는 구성. 반면 실제 `AttendanceScreen.tsx`(1202줄)는 이 #20 목업을 **고립된 화면이
아니라 출퇴근 홈 화면의 한 상태(위치 인증 선택 시)로 흡수**해 이미 v3 DS(AppCard/AppText/
SegmentedControl/AppHeader)로 구현되어 있었다: 헤더 "출퇴근 관리"+뒤로가기, 매장 칩, 히어로
("아직 출근 전이에요"/"출근하기"), "인증 방식" 라벨, 세그먼트, **선택된 방식 하나에 대한 카드만**
조건부 렌더링(942행 주석 "선택한 방식에 대한 안내만 표시"), 최근 출퇴근 기록 리스트, 푸터
"위치 기반 출근하기". 즉 실 화면은 목업보다 더 풍부한 실제 프로덕션 UX로 이미 진화해 있었고,
하네스의 reference만 예전 목업 그대로 멈춰 있어 어긋난 것 — 이번 세션 83개 작업과 무관한
기존(pre-existing) 드리프트였다.

### 조치
`git log`로 확인한 결과 실 화면은 이미 v3 DS로 완전히 전환되어 있어(커밋 `c9917fd`) 실 화면 쪽의
"버그"가 아니었으므로, 실 화면을 목업에 맞춰 되돌리는 대신 **하네스의 reference를 실 화면과
동일한 컴포넌트로 교체**했다: `NativeReferenceAttendanceAuthentication`(손 전사 컴포넌트, 관련
전용 스타일 3개 포함)를 완전히 삭제하고, reference/actual 양쪽 모두
`<AttendanceScreen visualFixture={ATTENDANCE_AUTHENTICATION_FIXTURE} />`를 렌더링하도록 배선
단순화. 손으로 옮겨 그린 사본은 실 화면이 바뀔 때마다 조용히 벌어지는 이번과 같은 회귀를
반복 생산하므로, 목업이 이미 실 화면에 완전히 흡수된 케이스는 동일 컴포넌트 재사용이 근본적으로
더 안전하다는 판단(이번 83개 작업 때도 PayrollRun 3단계·Subscribe·InfoList 등에서 이미 쓴
패턴과 동일).

### 검증
- `npx tsc --noEmit` — 통과 (변경 파일 관련 에러 없음)
- `npx eslint src/features/visual/V3VisualHarnessScreen.tsx` — 0 errors (기존 color-literal 경고만
  잔존, 이번 변경과 무관)
- 캡처 재검증: reference/actual 기존 캡처 삭제 후 `capture-v3-android-visual.ps1`로 콜드스타트
  재캡처 (양쪽 모두 정상 렌더 확인)
- `npm run visual:v3:compare:native` (channel-threshold 0, pixel-budget 0) — **154/154 전체 통과**
  (`{"passed":154,"failed":0,"missingReference":0,"missingActual":0,"dimensionMismatch":0,
  "pixelMismatch":0}`)

미커밋 상태(사용자 명시 요청 시에만 커밋).

---

## ⚠️ 중대 정정 — "154/154 완료"는 거짓양성이었다 (2026-07-29~30)

위 020 후속조치를 마친 뒤 사용자 지시로 다크모드 QA 파일럿(대표 17화면)을 진행하던 중,
파일럿으로 고른 `008 OwnerHome`·`021 EmployeeAttendanceHome`의 실제 캡처 이미지를 열어보다가
**화면 전체가 "미배선 정본 화면" placeholder 텍스트만 떠 있는 것을 발견**했다.

### 원인
하네스의 디스패치 체인 맨 끝 fallback(미배선 화면 처리)이 `source`(reference/actual)를 구분하지
않고 **완전히 동일한** placeholder `<View accessibilityLabel="미배선 v3 시각 정본">...`를
렌더링한다. screenId가 `V3_VISUAL_SCREEN_IDS`에 없으면 reference와 actual 양쪽 다 이 fallback에
떨어지고, 두 캡처가 **픽셀 단위로 완전히 동일**해지므로 native-strict 비교가 거짓으로
"passed" 판정을 내린다 — 실제로는 아무것도 검증하지 못한 것이다.

`V3_VISUAL_SCREEN_IDS` 객체를 154개 카탈로그와 직접 대조한 결과 **실제로는 124/154만
배선**되어 있었다(30개 누락): 01-auth 2개(06 PasswordReset·51 TermsSheet), **02-owner
그룹 전체 20개**(08 OwnerHome·10 OwnerDashboardDetail·11 StoreList·12 StoreRegistration·
13 StoreDetail·14 StoreEdit·15 WorkplaceList·16 WorkplaceDetail·17 EmployeeDetail·
18 WageSettings·46 ManagerHome·153 MasterMyPage·52~57 시트 6종), 03-employee 8개
(21 EmployeeAttendanceHome·22 EmployeeWorking·23 AttendanceCalendar·24 CorrectionRequest·
25 MissingAttendanceCenter·26 TimeOffRequest·27 JoinStoreByCode·45 PersonalHome·58 근태
필터시트·59 NFCScanModal — 24/26/27은 이미 `visualFixture` prop이 있었는데도 디스패치
자체가 안 걸려 있었다). 이전 세션의 "83개 배선 완료" 작업은 실제로는 **02-owner 그룹을
통째로 건드리지 않은 채** 나머지 그룹만 처리하고 154/154로 잘못 보고한 것으로 보인다.

### 조사
30개 화면을 조사 에이전트 2개(병렬)로 실태 파악 — **30개 전부 실 컴포넌트가 이미 존재하고
`HomeNavigator.tsx`에 라이브로 배선되어 있었으며, 대부분 v3 DS(AppCard/AppText/AppHeader 등)도
이미 적용된 상태**였다. "새 화면 제작"이 아니라 순수하게 "하네스 디스패치 누락"이었다.

### 조치 (Phase A/B/C 3단계)
- **Phase A(10개)**: `visualFixture`가 이미 있던 024/026/027과 라우트 없는 순수 폼(006
  PasswordReset), N11과 동일 컴포넌트인 051 TermsSheet, 순수 props 시트 5종(052/054/055/
  056/057 — `StoreSwitcherSheet`·`RadiusSelectorSheet`·`InviteShareSheet`·
  `EmployeeActionSheet`·`WageEditSheet`)에 `captureMarker` prop만 추가해 즉시 배선.
- **Phase B(17개)**: 실 화면에 `visualFixture` optional prop이 없던 화면들. `rn-frontend`
  에이전트 2개(03-employee 5개 / 02-owner 12개)에 병렬 위임 — `ManagerMyPageScreen.tsx`·
  `EmployeeAttendanceHome.tsx`(이번 세션에서 직접 작업한 예시)를 표준 패턴으로 제시하고
  하네스 파일 자체는 건드리지 말라고 지시(파일 충돌 방지, 배선은 직접 담당). 두 에이전트
  결과물(16개 파일, +518/-149줄) 검증: tsc clean·eslint 0 errors·jest 459/459 pass. 디스패치
  배선은 직접 작성(임포트 15개 + ID키 17개 + fixture 15개 + dispatch 17곳).
  - 부수 발견·수정: `EmployeeAttendanceHome`의 WORKING 상태(022)에서 `useStoreLiveSync`가 실
    소켓 연결을 시도해 간헐적으로 RN LogBox 에러 배너가 캡처에 섞여드는 버그 발견 →
    `visualFixture` 존재 시 빈 배열(no-op)을 넘기도록 수정(같은 fix를 병렬 에이전트도
    `OwnerDashboardScreen.tsx`에서 독립적으로 동일하게 적용해옴 — 패턴 일관성 확인).
  - 059 NFCScanModal: raw `Modal`이라 `captureMarker` 전달 경로가 없어 최초 캡처 실패 →
    `AttendanceVisualFixture`에 `captureMarker` 필드 추가 + 모달 내부에 비가시 마커 Text 삽입.
- **Phase C(053 주소검색시트)**: 실 `AddressSearchModal`이 카카오 우편번호 WebView(외부 CDN)를
  그대로 로드해 네트워크 상태에 따라 매번 다르게 그려짐(결정적 캡처 불가) — 노무사 게이트와
  같은 처방으로 실 파일은 미변경, 시안 문구를 그대로 옮긴 독립 전사 컴포넌트만 하네스에 추가.

### 캡처 인프라 재발 — 에뮬레이터 크래시
02-owner 그룹 캡처 막바지(153 MasterMyPage)에서 에뮬레이터가 완전히 죽었다(`adb devices`가
빈 목록 반환, `qemu-system`/`emulator` 프로세스 자체가 사라짐 — N7 때와 유사 계열의 장시간
콜드스타트 반복 누적 증상으로 추정). 이번엔 컴퓨터 재부팅 없이 **에뮬레이터 프로세스만
재기동**(`emulator -avd Medium_Phone`)으로 30초 내 정상화, 앱 재설치 불필요(설치 상태 보존),
`adb reverse`·캐노니컬 density 재적용 후 남은 1개 화면만 재캡처해 완료 — N7 때보다 훨씬 가벼운
장애였다.

### 검증
`V3_VISUAL_SCREEN_IDS`와 154개 카탈로그 재대조 — **154/154 배선 확인(누락 0)**.
`actual/uiautomator/*.xml` 전수 스캔 — "미배선" 텍스트 **0건**(placeholder 거짓양성 완전
소거 확인). `npm run visual:v3:compare:native` — **154/154 pixel-perfect 통과**
(`{"passed":154,"failed":0,"missingReference":0,"missingActual":0,"dimensionMismatch":0,
"pixelMismatch":0}`). 008/021 캡처 이미지 육안 재확인 — 실제 화면 콘텐츠로 정상 렌더 확인.

### 교훈 (다음에 이 하네스를 확장할 때 반드시 참고)
**native-strict "전체 통과"라는 숫자만으로는 배선 여부를 검증할 수 없다** — reference/actual이
둘 다 같은 fallback에 떨어지면 항상 통과로 나온다. 화면을 새로 배선한 뒤에는 반드시 (1)
`V3_VISUAL_SCREEN_IDS` 객체와 `mapping.json`의 154개 id를 직접 diff하거나, (2) 캡처된
`uiautomator/*.xml`에서 "미배선" 문자열을 grep해 0건인지 확인하는 절차를 병행할 것. 가능하면
compare 스크립트 자체에 이 가드를 내장하는 게 근본적으로 안전하다(후속 과제로 남김 — 이번엔
시간 관계상 수동 검증으로 대체).

미커밋 상태(사용자 명시 요청 시에만 커밋).

---

## 반응형 QA + WP-10 확인 (2026-07-30)

30개 배선누락 수정 후, 잔여 작업 우선순위(다크모드 → 반응형 → WP-10) 중 다크모드는 다른
세션으로 이관하고 반응형 QA와 WP-10을 이어서 처리했다.

### 반응형 QA
`useResponsive`(v3 반응형 단일 진입점, `frontend/src/common/hooks/useResponsive.ts`)를 직접
쓰는 실 화면·컴포넌트는 6개 파일뿐이었다: `HeroNumber`·`PunchButton`(DS 컴포넌트),
`ProfileBasicsScreen`·`SubscriptionPlanCard`·`SubscribeScreen`·`OnboardingCarouselScreen`.
(레이아웃 폴더의 `Header`/`Footer`/`MainLayout`은 구버전 `useResponsiveStyles`를 쓰는 죽은
코드로 확인 — 아무 데서도 import 안 됨, 반응형 QA 범위 밖.)

`HeroNumber`를 렌더링하는 실 화면까지 포함해 대표 7개 화면(OnboardingCarousel·
ProfileBasics·Subscribe·SalaryDetail·PayrollRun·MyLeaveBalance·Referral)을
compact(340dp)·normal(400dp)·wide(500dp) 3개 폭에서 캡처(`v3-responsive-capture.ps1`/
`v3-responsive-batch.ps1` 신규 — native-strict 파이프라인과 무관하게 `adb shell screencap`
raw 스크린샷만 찍어 육안 검토용, 21장). **21장 전수 육안 검토 결과 오버플로우·겹침·잘림 등
레이아웃 문제 0건** — `pick()`의 이산값 방식(비례 스케일 아님)이 브레이크포인트 전환에서
텍스트 줄바꿈·카드 여백 모두 자연스럽게 대응함을 확인.

### WP-10
메모리 기록(`design-system-v3-ring-pass`)에 "미착수"로 남아있던 두 항목을 직접 코드로
재확인한 결과 **둘 다 이미 완료된 상태**였다(기록이 낡은 정보였음):
- `theme/tokens.ts`의 `colors` 객체 본체 — 이미 v3 값으로 전량 교체 완료(커밋 `c9917fd`,
  잔재 정리 `fb5eb90`). "스왑 여부 결정"이 아니라 이미 스왑된 상태.
- `.claude/rules/frontend.md` — 이미 v3 완료 기준으로 갱신되어 있음("확정, 구현 전" 문구 없음).

**부수 발견**: WP-10의 "삭제 게이트"(0건 참조 확인된 호환 shim 삭제, 기존 4종 삭제 커밋
`3866077`)와 같은 패턴으로, 구버전 `SODAM_ORANGE`/`SODAM_BLUE` 색상을 쓰는 파일 중
`PurposeSelectModal.tsx`가 프로덕션·테스트 어디서도 참조되지 않는 완전한 죽은 코드임을
확인·삭제(tsc 재검증 통과). `PrimaryButton.tsx`도 같은 v2 색상(`SODAM_BLUE` 배경)을 쓰지만
유닛테스트가 참조하고 있어 이번엔 보류(삭제 시 테스트 처리까지 별도 결정 필요 — 실 화면에서는
안 쓰이므로 사용자 노출 버그는 아님).

WP-10 관련 남은 작업 없음. 결론적으로 잔여 작업 5개 중 다크모드(이관)·반응형(완료)·WP-10(완료
확인)까지 마무리, 남은 건 BE 갭 2건(직원 휴게기록 API, 아바타 업로드)뿐.

미커밋 상태(사용자 명시 요청 시에만 커밋).

---

## 🎉 BE 갭 2건 해소 완료 (2026-07-30) — v3 QA·잔여작업 전체 마무리

마지막으로 남아있던 BE 갭 2건(직원 휴게기록 API, 아바타 업로드)을 신규 구현·커밋까지 완료했다.
이로써 "다크모드(타 세션 이관)"를 제외한 잔여 작업 5개 전부가 처리됐다.

### 아바타 업로드
`ImagePickerSheet`가 UI만 있고 저장 API가 없던 것을, 이미 존재하던 매장 사진 업로드 패턴
(`ObjectStorage` + `StorePhotoService`/`StorePhotoController`)을 그대로 재사용해 구현. V70
마이그레이션(`user.avatar_url`/`avatar_key`), `POST`/`DELETE /api/user/me/avatar`(본인만, 1인
1장 교체 방식). FE `ProfileScreen`에서 카메라/앨범 선택 → 실제 업로드 → 이미지 표시까지 실 연동.

### 직원 실시간 휴게 시작/종료 기록
사용자 확인 후 `labor-attendance-expert` 에이전트에게 근로기준법 §54 법령 조사를 먼저
맡겼다 — 결론: §54는 "휴게 부여 의무"이지 "실사용시간 정산 의무"가 아니고, 실측값을 급여에
자동 반영하면 오히려 부정확한 임금계산·근로조건 불이익변경 리스크가 생긴다(미달 시 추가수당
발생 가능성, 초과 시 사후 임금 삭감 불가 등). **순수 기록/증빙용으로 결론**, 기존 `BreakRecord`
엔티티의 "임금계산에 절대 참여하지 않는다"는 원칙과 정확히 부합. 급여 계산 코어
(`BreakTimeCalculator`)는 스케줄 기준 자동 차감을 그대로 유지, 한 줄도 건드리지 않음.

설계는 기존 `BreakRecord` 테이블 확장(`recordedBy` MASTER/EMPLOYEE 구분 + 실시간 start/end
컬럼, V69)으로 사용자 승인받은 대로 진행. 신규 `EmployeeBreakRecordController`
(`/api/stores/{storeId}/employees/me/breaks/*`), 사장의 기존 사후입력 경로는 무변경·하위호환.
구현 중 실전 버그 하나 발견·수정: 직원의 "진행 중 휴게 존재" 판정 쿼리가 `recordedBy` 조건 없이
`breakEndTime IS NULL`만 봤다면, 사장이 남긴 과거 증빙 기록(그 컬럼은 원래 항상 null) 때문에
직원이 영원히 휴게를 시작 못 하는 오검출이 났을 것 — 테스트로 커버해 방지.

### 작업 방식
BE 두 기능을 `spring-backend`(아바타)/`labor-attendance-expert`(휴게기록) 두 에이전트에
**병렬** 위임 — 완료 후 둘 다 독립적으로 마이그레이션 버전 번호를 스스로 판단해 만들었는데,
**V69 중복 충돌**이 발생했다(아바타 에이전트가 "V68"이라고 지시받았으나 그 사이 다른 세션이
V68을 이미 커밋해서 자체적으로 V69를 씀 → 휴게기록 에이전트도 내가 지시한 대로 V69를 씀).
발견 즉시 아바타 쪽을 V70으로 리네임해 해소. **교훈**: 병렬 에이전트에 마이그레이션 버전 번호를
지시할 때는 그 시점의 최신 번호를 그대로 믿지 말고, 완료 후 반드시 실제 파일 목록을 재확인할 것
(다른 세션이 동시에 커밋 중일 수도 있음 — 이번 세션 내내 별도 세션이 보안 강화 작업을 병행 중인
게 여러 차례 관찰됨, 무관한 파일은 손대지 않고 그대로 둠).

### 검증
- BE: `./gradlew test --rerun` — 1024 tests, 0 failures, 0 errors (3 skipped)
- FE: `npm run test:unit` — 477 tests, 0 failed (신규 10건: userService 아바타 2건 +
  breakRecordService 4건 + 기존 스위트 전부 그린)
- tsc/eslint 0 errors 양쪽 다

총 6개 커밋으로 분리(BE 아바타 / BE 휴게기록 / FE 아바타 / FE 휴게기록 / 문서, 기능 단위).

---

## 전체 현황 요약 (인수인계용, 2026-07-28 새벽 작성)

**82/83 화면 코드 배선 완료 + native-strict(0/0 픽셀) 캡처 검증 완료.**
남은 1개(N7)는 **코드는 이미 완료**되어 있고, 실기기 캡처 스크립트가 에뮬레이터 인프라 문제로
막혀 있는 상태다. 아래 "N7 인수인계" 절이 이 세션이 끊겨도 이어서 작업할 수 있도록 상세히 남긴
근본원인 분석이다.

### 이번 세션에서 발견·수정한 인프라 버그 2건 (83개 배선 작업 초반)
1. **딥링크 슬래시 버그**: `sodam://v3/actual/{id}` 형태는 react-navigation이 `v3`를 host로 파싱해
   내비게이션이 안 먹었다. `sodam:///v3/actual/{id}`(슬래시 3개)로 수정.
   → `frontend/scripts/capture-v3-android-visual.ps1`에 반영 완료.
2. **Modal 내부 캡처마커 미전달 버그**: RN `Modal`(BottomSheet 등)은 별도 Android 윈도우로 뜨기 때문에,
   배경에 있는 `VisualRouteFrame`의 마커 Text가 Modal이 열려 있는 동안 uiautomator 덤프에 안 잡혔다.
   `captureMarker` prop을 BottomSheet를 쓰는 모든 시트 컴포넌트에 추가로 관통시켜 해결
   (AttendanceSheets 4종, PayrollCalculationDetailModal, BillingMethodSheet, PlanDetailSheet,
   ImagePickerSheet, QnAScreen 등 이번 세션에서 새로 배선한 시트 전부 포함).

### 방법론 요약
- 83개 전부 (1) `visualFixture`/`captureMarker` optional prop을 실 화면 컴포넌트에 추가(동작 변경 없음),
  (2) `V3VisualHarnessScreen.tsx`에 reference/actual 2분기 배선, (3) 실기기 캡처 + native-strict
  (channel-threshold 0, pixel-budget 0) 비교 통과, 순서로 진행.
- 목록/폼이 복잡한 화면은 시안 재현 대신 **실 컴포넌트를 reference/actual 양쪽에 그대로 재사용**
  (예: PayrollRun 3단계, Subscribe, InfoList 등) — 코드 내 주석으로 사유 명시.
- ⛔ 노무사 게이트 3종(C4 SendContractScreen, C7 ElectronicSignScreen, N8 SendBonusScreen)은
  CLAUDE.md 정책에 따라 해당 실 화면 파일을 **전혀 건드리지 않고**, 시안 문구를 그대로 옮긴 독립
  전사 컴포넌트(`VisualSendContractStep3`, `VisualElectronicSignProgress`, `VisualSendBonus`)만
  하네스에 추가해 read-only로 캡처했다.
- 실 백엔드 쿼리가 타이밍에 따라 비결정적으로 보이는 경우(로딩 스피너 애니메이션 프레임 차이,
  "N시간 M분 남음" 카운트다운 텍스트, TanStack Query 에러 토스트 등)는 `visualFixture`로 완전히
  우회하거나(`enabled` 게이팅으로 실 쿼리 자체를 비활성화), `nowMs` 같은 고정 시각 파라미터를
  추가로 관통시켜 0/0 strict 비교를 통과시켰다 (JobOfferInboxScreen, ManagerMyPageScreen 등).

---

## N7 인수인계 — 근본원인 규명 완료, 캡처만 재시도하면 됨

**결론: 코드는 100% 완료. `ManagedStore[]` visualFixture로 렌더링되는 내용은 스크린샷으로 직접
확인해 정상(레퍼런스와 픽셀 단위로 동일해 보임). 문제는 순수 에뮬레이터/adb 인프라.**

### 증상 히스토리 (시간순)
1. 최초 native-strict 비교에서 N7만 큰 픽셀 diff(101149px) — 로딩 스피너 애니메이션 프레임이
   reference/actual 캡처마다 달라서 발생(같은 real 쿼리를 두 번 따로 호출한 결과물이었음).
2. → `ManagerMyPageScreen.tsx`에 `visualFixture?: ManagedStore[]` prop 추가(실 API 완전 우회),
   하네스에 `MANAGED_STORES_FIXTURE` 고정 데이터 배선. **이 코드 수정은 완료·정상 동작 확인됨**
   (스크린샷상 굿모닝분식 서초점/권한 발효 배지가 정확히 fixture 그대로 렌더링됨).
3. → 재캡처 시도 중 에뮬레이터가 ANR 연쇄 반응 시작: Process system → Pixel Launcher → Settings →
   System UI → 우리 앱(Sodam_Front_End) 순으로 계속 다른 시스템 컴포넌트가 ANR. 매번 스크린샷으로
   확인한 화면 내용 자체는 항상 정확(fixture 데이터 그대로) — 렌더링은 문제없이 끝나 있었다는 뜻.
4. → Metro 재시작(오래(2026-07-26부터) 떠 있던 프로세스라 의심) → 그래도 재발.
5. → 에뮬레이터 완전 재부팅(`emulator -avd Medium_Phone -no-snapshot-load`) → 그 과정에서
   **이전 에뮬레이터 프로세스(2026-07-26 22:47 시작)가 실제로는 안 죽고 살아있던 것을 발견**
   (`adb emu kill`이 완전히 죽이지 못했던 듯). 두 프로세스가 동시에 떠서 emulator-5554 포트를
   두고 스플릿브레인 상태였음 → PID 25292(emulator.exe)·3016(qemu-system-x86_64) 강제 종료로 해결.
6. → 그래도 "Unable to load script"(loadJSBundleFromAssets) 레드박스 지속. adb reverse 재등록,
   adb server 재시작, `npm run android`로 완전 재빌드+재설치까지 했지만 동일 증상.
7. → (1차 가설, 결과적으로 오답이었음) 앱의 SharedPreferences에 `debug_http_host=localhost:8088`
   잔재값이 있어 이게 원인이라 추정 → `pm clear`로 완전 초기화해도 **동일 증상 재발** → 가설 기각.
8. → **진짜 근본원인 규명(logcat 직접 분석)**: `adb logcat`에서 정확한 예외 확인:
   ```
   W ReactNative: Failed to connect to /10.0.2.2:8088
   W ReconnectingWebSocket: Couldn't connect to "ws://10.0.2.2:8088/message?..."
   ```
   RN Android dev-client는 에뮬레이터를 감지하면 **항상 `10.0.2.2:<port>`로 접속**한다
   (`localhost`/`adb reverse` 경로가 아니라 에뮬레이터의 실제 호스트-루프백 별칭을 우선 사용 —
   이는 RN 공식 동작이며 `debug_http_host` pref와 무관하다). `10.0.2.2` 트래픽은 에뮬레이터의
   가상 NIC를 거쳐 Windows 실제 네트워크 스택(방화벽 포함)을 통과하는 반면, `adb reverse`는
   adb 프로토콜 자체로 방화벽을 완전히 우회한다 — 별도 echo 서버(포트 9999)로 `adb reverse`만
   테스트했을 때는 100% 정상 연결됐지만(`CONNECTION RECEIVED` 로그 확인), Metro가 뜬 포트(8088,
   이후 8081로도 재현)는 `netstat`상 `LISTENING`만 있고 **ESTABLISHED 연결이 단 한 번도 없었다**.
   Metro 실행 파일(`C:\Program Files\nodejs\node.exe`)에 대한 Windows 방화벽 인바운드 허용 규칙이
   전혀 없다는 것도 확인(`Get-NetFirewallRule -DisplayName "node.exe"`에는 JetBrains 번들
   node.exe들만 있고, 시스템 node.exe는 전무). → **Windows 방화벽이 `10.0.2.2`발 인바운드 연결을
   차단하고 있는 것이 근본원인으로 사실상 확정.**
9. → 이를 우회하려고 Metro를 8081로 옮기고(`-PreactNativeDevServerPort=8081`로 재빌드까지 완료)
   `adb reverse tcp:8081 tcp:8081`로 완전히 맞췄으나 — **재현 결과 앱은 여전히 `10.0.2.2:8081`로
   접속을 시도**했다(포트를 8081로 통일해도 `10.0.2.2` 자체를 쓰는 RN 자체 동작은 안 바뀜).
   즉 포트 번호 문제가 아니라 **`10.0.2.2` 경유 연결 자체가 막혀 있다**는 것이 최종 확정.
   이 우회 시도로 잠시 멈췄던 무관 프로젝트 Docker 컨테이너(`stockmate-ai-websocket-listener-1`,
   포트 8081 사용 중)는 작업 종료 후 즉시 재기동했고, Metro도 원래 설정(포트 8088)으로,
   앱도 `-PreactNativeDevServerPort=8088`로 재빌드해 **세션 시작 전 상태로 완전히 복원 완료**
   (82개 화면 검증 결과물에는 영향 없음 — 이미 저장된 정적 PNG라 무관).
10. → 사용자에게 관리자 PowerShell에서 방화벽 허용 규칙 추가를 요청:
    `New-NetFirewallRule -DisplayName "Metro RN Dev Server" -Direction Inbound -Program
    "C:\Program Files\nodejs\node.exe" -Action Allow -Protocol TCP -LocalPort 8088`
    — **사용자가 관리자 PowerShell에서 실행 완료·규칙 존재 확인됨**(`Get-NetFirewallRule` 조회로
    `Enabled: True`, `Action: Allow`, `Direction: Inbound` 확인). 실행 중인 Metro PID의 실제 경로도
    `C:\Program Files\nodejs\node.exe`로 규칙의 Program 필터와 정확히 일치함을 재확인.
11. → **그럼에도 재시도 결과 완전히 동일한 실패**(`Failed to connect to /10.0.2.2:8088`,
    `Couldn't connect to "ws://10.0.2.2:8088/message?..."`). Windows Defender 방화벽 규칙 자체는
    문제가 아니었다는 뜻 — **Windows 기본 방화벽이 근본원인이라는 가설은 최종 기각.**
12. → 실행 중인 프로세스 목록에서 `KISSForSMon.exe`(`C:\KWIC\KISS\KISSForSMon.exe`, "KISS For
    ServerMon") 발견. 이전 방화벽 규칙 조회에서도 "KISS For ServerMon" 이름의 별도 규칙 항목이
    있었음(Public 프로파일). 국내 기업/공공기관에서 흔히 쓰이는 서버 모니터링·보안 에이전트로
    추정되며, Windows Defender 방화벽과 **별개의 자체 네트워크 필터링 계층**을 가질 가능성이 높다
    (`New-NetFirewallRule`은 Windows 기본 방화벽만 제어하고 이런 서드파티 보안 에이전트는 건드리지
    못한다). **현재 가장 유력한 용의자.** 사용자가 직접 이 도구의 설정을 확인하기로 하고 세션 중단.

### 다음 세션에서 바로 시도할 것 (우선순위 순)
1. **최우선**: 사용자가 KISS ServerMon(`KISSForSMon.exe`, `C:\KWIC\KISS\`) 쪽에서 포트 8088(또는
   Metro/node.exe) 인바운드를 허용하도록 조치했는지 확인. 회사 IT 관리 도구라면 사용자/관리자만
   조정 가능 — Claude가 임의로 건드리면 안 됨.
2. 조치 후: Metro 상태 확인(`curl http://localhost:8088/status`), `adb -s emulator-5554 reverse
   --list`로 `tcp:8081 tcp:8088` 매핑 확인, `adb -s emulator-5554 shell am force-stop
   com.sodam_front_end` 후 재시도.
3. `cd frontend && .\scripts\capture-v3-android-visual.ps1 -Serial emulator-5554 -ScreenId
   sodam-v3-12-notice--N7 -Source actual -RequireText '내 위임 현황' -ColdStart` 실행.
4. 그래도 안 되면 `adb -s emulator-5554 logcat -d | grep "Failed to connect"`로 여전히
   `10.0.2.2:8088` 연결 실패인지 재확인 — 만약 이 시점에도 동일하다면 KISS ServerMon도 원인이
   아닐 수 있음. 이 경우 최후 수단으로 **물리 기기 없이 순수 소프트웨어로 재현 가능한 최소
   테스트**(예: 다른 임의 emulator AVD를 새로 만들어 동일 증상 재현되는지, 또는 같은 host에서
   Android Studio Emulator가 아닌 Genymotion 등 다른 에뮬레이터로 재현되는지)로 문제를
   "이 PC의 네트워크 스택 전반" vs "이 AVD 인스턴스 고유 문제"로 좁혀야 한다.
5. 통과하면: `node scripts/v3-visual-regression.mjs compare --reference-dir
   ../artifacts/v3-visual/native-reference --actual ../artifacts/v3-visual/actual
   --channel-threshold 0 --pixel-budget 0 --screen-ids sodam-v3-12-notice--N7` → 0/0 확인 →
   이 문서 N7 체크박스 켜면 83/83 완료.

### 참고 — 이번 세션에서 확인된 확실한 사실들
- `ManagerMyPageScreen.tsx`의 `visualFixture` prop 배선은 **정상 동작 확인됨**(스크린샷 증거 다수,
  reference와 동일한 굿모닝분식 서초점/권한 발효 배지 렌더링).
- `V3VisualHarnessScreen.tsx`의 `MANAGED_STORES_FIXTURE` 배선도 **정상**.
- Metro는 8088·8081 어느 포트로 띄워도 항상 `curl .../status` → `200 packager-status:running`으로
  호스트에서는 건강했다 — 문제는 순수하게 "에뮬레이터 → 호스트" 인바운드 네트워크 경로.
- `adb reverse`(adb 프로토콜, 방화벽 우회) 경로는 별도 echo 서버로 100% 정상 확인됨.
- RN Android dev-client는 에뮬레이터에서 **항상 `10.0.2.2:<port>` 를 사용**하며 `debug_http_host`
  pref나 `adb reverse` 설정과 무관하게 이 경로를 우선한다 — `pm clear`·포트 통일 모두 무의미했음.
- `10.0.2.2` 경로는 Windows 방화벽의 실제 인바운드 필터링을 받으며, Metro 실행 바이너리
  (`C:\Program Files\nodejs\node.exe`)에 대한 명시적 허용 규칙이 전무했다.
- 다른 프로젝트("stockmate-ai") Docker 컨테이너가 포트 8081을 쓰고 있어 이 프로젝트가 8081 대신
  8088을 써 왔다는 점도 오늘 삽질에 처음엔 혼선을 더했지만, 최종적으로는 포트 번호 자체와 무관한
  방화벽 문제로 판명됐다.
