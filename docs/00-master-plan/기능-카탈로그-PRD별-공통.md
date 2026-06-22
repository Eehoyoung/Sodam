# 소담(SODAM) 기능 카탈로그 — PRD 역할별 · 공통 (전수)

> 작성: 2026-06-19 · 코드 인벤토리(컨트롤러 52 · FE 화면 ~90) 기반 전수 정리.
> **범례** — 상태: ✅ 구현·그린 / 🔑 코드 완비·env키/외부계약 시 동작 / 🟡 잔여(인간·외부).
> 역할(PRD): **게스트** · **사장님(Owner/MASTER)** · **직원(Employee)** · **개인·긱워커(Personal)** · **관리자(Manager)** · **공통(Cross)**.
> 엔드포인트는 대표 경로만 표기(상세는 `backend/ApiList.yaml`).

---

## 0. 공통 기능 (Cross — 전 역할 공유)

| 기능 | 화면(FE) | 엔드포인트(BE) | 상태 |
|---|---|---|---|
| 알림 센터(인박스) | NotificationCenterScreen | `/api/notifications/inbox`·`/ack` | ✅ |
| 푸시 알림(FCM) | PushPrimerSheet | (FCM SDK) | 🔑 FCM 키 |
| 알림 설정 | NotificationSettingsScreen | `/api/notifications/settings` | ✅ |
| 시즌 캠페인 배너(종소세 5월·부가세 1·7월) | (홈 배너) | `/api/campaigns/active` | ✅ |
| 노동법 정보 허브 | InfoListScreen · LaborInfoDetailScreen | `/api/labor-info` | ✅ |
| 세무 정보 허브 | TaxInfoDetailScreen | `/api/tax-info` | ✅ |
| 정책·지원 정보 | PolicyDetailScreen | `/api/policy-info` | ✅ |
| 꿀팁 | TipsDetailScreen | `/api/tip-info` | ✅ |
| Q&A | QnAScreen | `/api/qna-info` | ✅ |
| 세무 시뮬레이터(예상 종소세) | TaxSimulatorScreen | `/api/tax/simulate` | ✅ |
| 앱 설정 | SettingsScreen | — | ✅ |
| 계정 설정·탈퇴 | AccountSettingsScreen | `/api/user` · `/api/users` | ✅ |
| 강제 업데이트 | AppUpdateScreen | (버전 체크) | ✅ |
| 점검 모드 | MaintenanceScreen | — | ✅ |
| 약관 웹뷰 | LegalWebviewScreen | (정적) | ✅ |
| 세션 만료·권한 거부 | SessionExpiredScreen · PermissionDeniedScreen | — | ✅ |
| 비밀번호 재설정 | PasswordResetScreen | `/api/auth/password-reset` | ✅ |
| 약관·개인정보 동의 | ConsentScreen | `/api/auth/consents` | ✅ |

---

## 1. 게스트 (로그인 전 · 온보딩)

| 기능 | 화면(FE) | 엔드포인트(BE) | 상태 |
|---|---|---|---|
| 스플래시 | SplashScreen | — | ✅ |
| 웰컴/메인 진입 | WelcomeMainScreen · HybridMainScreen | — | ✅ |
| 온보딩 캐러셀 | OnboardingCarouselScreen | — | ✅ |
| 사용 목적 선택(사장/직원/개인) | UsageSelectionScreen | `/api/users/purpose` | ✅ |
| 이메일 회원가입 | SignupScreen | `/api/auth/...` · `/api/user` | ✅ |
| 카카오 로그인 | KakaoLoginScreen | (카카오 OAuth) | 🔑 카카오 키 |
| 로그인 | LoginScreen | `/login` (JWT 발급) | ✅ |
| 프로필 기본정보 입력 | ProfileBasicsScreen · ProfileScreen | `/api/user` | ✅ |
| 추천 코드 입력(가입 시) | (ReferralScreen·apply) | `/api/referrals/apply` | ✅ |

---

## 2. 사장님 (Owner / MASTER)

### 2-1. 매장·직원 관리
| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 사장 홈 대시보드(콜드스타트·인사이트) | OwnerDashboardScreen · HomeScreen | `/api/stores/...` | ✅ |
| 매장 등록 | StoreRegistrationScreen | `/api/stores/registration` | ✅ |
| 매장 상세·관리 허브 | StoreDetailScreen | `/api/stores/{id}` | ✅ |
| 매장 정보 편집 | StoreEditScreen | `PUT /api/stores/{id}` | ✅ |
| 매장 운영시간 설정 | StoreOperatingHoursScreen | `/api/stores/{id}/operating-hours` | ✅ |
| 매장 사진 | (StorePhoto) | `/api/stores/{id}/photos` | ✅ |
| **매장 설정 완성도 게이지+다음 한 가지** | (OwnerDashboard 카드) | `/api/stores/{id}/setup-progress` | ✅ |
| 직원 상세(탭: 정보·출퇴근·급여·연차) | EmployeeDetailScreen | `/api/user/{id}` · `/api/wages/...` | ✅ |
| 직원 활성/비활성 | (EmployeeDetail) | `PUT /api/stores/{id}/employees/{eid}/active` | ✅ |
| 직원 초대(코드) | (InviteShareSheet) | `/api/stores/.../code` | ✅ |
| **직원 온보딩 체크리스트(계약·시급·첫출근)** | OnboardingScreen | `/api/stores/{id}/employees/{eid}/onboarding` | ✅ |

### 2-2. 시급·급여·명세서
| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 매장 기준 시급·직원 개별 시급 | WageSettingsScreen | `/api/wages/...` · `/api/stores/{id}/history` | ✅ |
| 급여 정산(명세서 생성) | PayrollRunScreen | `/api/payroll/...` | ✅ |
| **급여 미리보기(D0 aha·주휴 포함)** | PayrollPreviewScreen | `/api/stores/{id}/payroll-preview` | ✅ |
| 명세서 목록·상세·보관 | SalaryListScreen · SalaryDetailScreen · SalaryArchiveScreen | `/api/payroll/...` | ✅ |
| 명세서 PDF(STARTER 게이팅·**월1회 무료**) | PdfPreviewScreen | `/api/payroll/{id}/pdf` | ✅ |
| 급여 정책 설정(3.3%/4대보험) | (PayrollPolicy) | `/api/payroll-policy` | ✅ |
| **연장근로 한도(주52h) 경보** | (PayrollRun 경고) | `/api/stores/{id}/overtime-check` | ✅ |
| **주휴 월경계 정합성 알림** | (정산 advisory) | `/api/stores/{id}/payroll/boundary-advisory` | ✅ |

### 2-3. 노무·세무·법정 서류
| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 근로계약서 작성·발송(전자서명 요청) | SendContractScreen | `POST /api/stores/{id}/labor-contracts`·`/send` | ✅ |
| 연차·퇴직금·인건비 집계 | (LaborAggregation) | `/api/master/labor` | ✅ |
| 4대보험 신고서 서식 자동채움 | (InsuranceFiling) | `/api/master/insurance` | ✅ |
| **직원 서류함·보건증 만료경보** | EmployeeDocumentsScreen · AddDocumentScreen | `/api/stores/{id}/employees/{eid}/documents` | ✅ |
| **연소근로자(만18세 미만) 가드** | MinorGuardScreen | `/api/stores/{id}/employees/{eid}/minor-guard` | ✅ |
| **휴게부여 증빙(§54)** | BreakRecordScreen | `/api/stores/{id}/employees/{eid}/breaks` | ✅ |
| **법정 장부(임금대장·근로자명부)** | LegalLedgerScreen | `/api/stores/{id}/ledger/wage`·`/roster` | ✅ |
| **임금체불 진정 증거패키지** | EvidencePackageScreen | `/api/stores/{id}/employees/{eid}/evidence` | ✅ |
| **간이지급명세서·원천징수 집계** | WithholdingStatementScreen | `/api/stores/{id}/tax/withholding-statement` | ✅ |
| **원천세 월요약·부가세 분기 기한** | TaxDeadlineScreen | `/api/stores/{id}/tax/withholding-monthly`·`/vat-deadline` | ✅ |
| **고용세액공제 상시근로자 추이** | HeadcountTrendScreen | `/api/stores/{id}/tax/headcount-trend` | ✅ |
| **두루누리·고용지원금 자격판정** | SubsidyEligibilityScreen | `/api/stores/{id}/subsidy/eligibility` | ✅ |
| CSV 내보내기 | (Export) | `/api/export` | ✅ |
| 세무 패키지 송객(단건결제) | (TaxServiceOrder) | `/api/billing/tax-orders` | 🔑 세무사 계약 |

### 2-4. 매입·인사이트·공지
| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| **매입장부(영수증→품목·단가)** | PurchaseLedgerScreen · PurchaseScanScreen · PurchaseConfirmScreen | `/api/stores/{id}/purchases`·`/scan` | ✅ (OCR 🔑) |
| **가격비교(단가 추이)** | PriceTrendScreen | `/api/stores/{id}/purchases/price-trend` | ✅ |
| **발주 참고(매입주기)** | ReorderHintScreen | `/api/stores/{id}/purchases/reorder` | ✅ |
| **이번 주 인사이트(퍼널 계측)** | WeeklyInsightsScreen | `/api/stores/{id}/insights/weekly` | ✅ |
| **매장 공지+읽음확인** | StoreNoticeListScreen · WriteNoticeScreen | `/api/stores/{id}/notices`·`/reads` | ✅ |
| **근무 시프트 등록** | EditShiftScreen | `/api/stores/{id}/shifts` | ✅ |

### 2-5. 구독·결제·레퍼럴
| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 4티어 구독(FREE/STARTER/PRO/PREMIUM) | SubscribeScreen · SubscriptionGateScreen | `/api/billing/...` | ✅ |
| 토스 정기결제 빌링키 | TossBillingAuthScreen | `/api/billing/...` · `/api/billing/webhook` | 🔑 토스 실키·webview |
| 결제 성공/실패 | PaymentSuccessScreen · PaymentFailedScreen | — | ✅ |
| 일시정지·재개 | (Subscribe) | `/api/billing/...pause·resume` | ✅ |
| **맥락형 페이월(멀티매장)** | PaywallSheet · PaywallHost | (402 PLAN_REQUIRED) | ✅ |
| **레퍼럴 보상(첫결제→양측 무료1개월)** | ReferralScreen | `/api/referrals/my-code`·`/apply`·`/my-rewards` | ✅ |
| 마이페이지(사장) | MasterMyPageScreen | `/api/master/...` | ✅ (P2 디자인) |

---

## 3. 직원 (Employee)

| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 직원 출퇴근 홈(NFC/GPS 펀치) | EmployeeAttendanceHome · AttendanceScreen | `/api/attendance/...` | ✅ |
| 월간 근무 캘린더 | AttendanceCalendarScreen | `/api/attendance/...` | ✅ |
| 출퇴근 정정 요청 | AttendanceCorrectionRequestScreen | `POST /api/attendance/{id}/correction-request` | ✅ |
| 출퇴근 누락 센터 | MissingAttendanceCenterScreen | `/api/attendance/...` | ✅ |
| **내 요청 현황(정정·휴가 통합)** | RequestStatusScreen | `/api/requests/my` | ✅ |
| 내 급여 명세 조회·공유 | SalaryDetailScreen · SalaryListScreen | `/api/payroll/...` | ✅ |
| **내 시급 변경 이력** | MyWageHistoryScreen | `/api/wage/my/history` | ✅ |
| 휴가 셀프 신청 | TimeOffRequestScreen | `/api/timeoff/self` | ✅ |
| **내 잔여 연차** | MyLeaveBalanceScreen | `/api/timeoff/my/leave-balance` | ✅ |
| **내 근로계약서 열람·서명** | MyContractScreen · ContractSignScreen | `/api/labor-contracts/my`·`/sign` | ✅ |
| **공지 확인·읽음** | MyNoticeScreen | `/api/notices/my`·`/ack` | ✅ |
| **내 근무 일정(시프트)** | MyShiftScreen | `/api/shifts/my` | ✅ |
| **내 온보딩 체크리스트** | OnboardingScreen | `/api/onboarding/my` | ✅ |
| **출근 셀프 리마인드(시프트 전)** | (알림) | (ShiftReminderScheduler) | ✅ |
| 마이페이지(직원) | EmployeeMyPageRNScreen | `/api/user/{id}` | ✅ |
| 매장 합류(코드) | JoinStoreByCodeScreen | `/api/stores/.../join` | ✅ |

---

## 4. 개인 · 긱워커 (Personal)

| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 개인 멀티매장 홈 | PersonalUserScreen | `/api/personal-users/{id}` | ✅ (P2 디자인) |
| 근무지 목록·등록 | WorkplaceListScreen | `/api/personal-users/{id}/workplaces` | ✅ |
| 근무지 상세 | WorkplaceDetailScreen | `/api/personal-users/{id}/workplaces/{wid}` | ✅ |
| 개인 출퇴근·타이머·수동입력 | (PersonalUser) | `/api/personal-users/{id}/attendances` | ✅ |
| 월별 통계(매장별 분해) | (PersonalUser) | `/api/personal-users/{id}/...` | ✅ |
| **연간 사업소득·환급 신호(3.3% 합산)** | PersonalAnnualTaxScreen | `/api/personal-users/{id}/annual-tax-summary` | ✅ |

---

## 5. 관리자 (Manager)

| 기능 | 화면 | 엔드포인트 | 상태 |
|---|---|---|---|
| 매니저 마이페이지 | ManagerMyPageScreen | `/api/master/...`(MANAGER 허용) | ✅ |
| 매장 관리(위임 권한) | (사장 화면 공유) | `@MasterOnly`(MASTER/MANAGER/BOSS) | ✅ |
| 운영·테스트 보조 | (TestController) | `/api/test` | ✅ (개발) |

> 관리자(MANAGER)는 `@MasterOnly`(hasAnyRole MASTER/MANAGER/BOSS)로 사장 기능 대부분 접근. 별도 전용 화면은 마이페이지 1종.

---

## 📊 요약 통계
- **공통 19 · 게스트 9 · 사장님 ~45 · 직원 16 · 개인 6 · 관리자 3** = 화면 ~90, 엔드포인트(컨트롤러) 52.
- 이번 세션 신규 추가: 매입장부·전자서명·세무자료 6종·노무가드 4종·온보딩·시프트·공지·인사이트·레퍼럴 보상 등 **31개 기능**.
- 상태: 코드 기준 **출시 가능(GO)** — ✅가 절대다수, 🔑는 외부 키·계약만(코드 완비), 🟡 없음(코드 차단 0).

> 정체성 경계: POS·재고차감·원가율·채용·다국어 = **Non-Goal(미구현·의도적)**. 매입장부는 "사는 것 기록·비교"까지만.
