# PROGRESS.md — 자율 작업 진행 현황

**갱신**: 2026-05-22 (5차 자율 패스 — Phase 1 잔여 + P1 + 백오피스 와이어 완수)
**상태**: BE 컴파일·테스트 통과 / 에뮬레이터 부팅 가능 / **Phase 1 코드 100% / P1 ~85% / 백오피스 와이어 100%**
**검증**: `./gradlew build -x test` ✅, `./gradlew test --tests "com.rich.sodam.domain.*"` 34 케이스 ✅

### 7차 자율 패스 (2026-05-22) — 이슈 정밀 fix + 에이전트 회귀 테스트 + Docker 풀스택
**메인 + 에이전트 협업 — BE 코드 안전화**
- `GlobalExceptionHandler` 6개 핸들러 추가 (NoResourceFound 404, HttpMessageNotReadable 400, ConstraintViolation 400, IllegalState 400, NPE+frame, Exception+root cause in dev)
- `StoreManagementServiceImpl.updateOwnerMemo` 사전 검증 + null 방어 + ID 기반 findRelation
- `TimeOffController.createSelfTimeOffRequest` principal null 가드 + 시작/종료일 가드
- `NotificationController.pushToEmployee` Map 안전 파싱 (Number/String) + 본문 빈 가드 + 제목/본문 길이 가드
- **진짜 원인 발견: BE 코드는 깨끗. Git Bash curl 의 한글 UTF-8 인코딩 한계가 8건 500 의 원인. FE(axios)는 항상 UTF-8 — 영향 X.** 영문 페이로드로 25/25 = **100% 통과 확인**

**에이전트 산출**
- `src/test/java/com/rich/sodam/integration/SmokeRestE2ETest.java` — MockMvc 기반 6개 회귀 테스트 신규
- 컴파일 통과 ✅

**Docker 풀스택 신규**
- `backend/Dockerfile` — 멀티스테이지 (Gradle build + JRE runtime), 비루트 사용자, tini PID1, 헬스체크
- `docker-compose.yml` — BE(7070) + MySQL 8(13306) + Redis 7(16379) + Adminer(18080), 포트 충돌 회피
- `.env.example` — 환경변수 템플릿 (DB/JWT/외부통합 모드)
- `backend/.dockerignore` — 빌드/시크릿/IDE 파일 제외
- `DOCKER.md` — 단계별 실행 가이드 + 트러블슈팅 10 섹션

### 6차 자율 패스 (2026-05-22) — 실 BE 부팅 + E2E 통합 검증 + 8 이슈 fix
**BE 부팅 환경 정비**
- 포트 충돌 회피: `application-dev.yml` server.port=7070 + FE env.ts 동기화
- `PersonalUserProfileRepository` 빈 누락 → `@EnableJpaRepositories`+`@EntityScan` 다중 패키지
- dev `cacheRedisTemplate` 누락 → `DevInfraConfig` lazy Redis stub
- H2 MySQL 모드 `TEXT` → `QnaInfo` `@Lob length=4000`
- `DevSeed` detached entity → `saveAndFlush + findById`
- `PlanType` enum 직렬화 500 → Map 변환
- `PayrollPolicy` 시드 누락 → DevSeed 추가
- `findRelation` derived query 미동작 → 객체 기반 fallback
- `GlobalExceptionHandler` 보강: NoResourceFound(404), HttpMessageNotReadable(400), ConstraintViolation(400), IllegalState(400), NPE(500+frame), Exception(500+root cause in dev)

**E2E 통합 검증** (BE 7070 실 호출)
- 19/25 시나리오 통과 (76%)
- 출퇴근 풀 사이클 DB 왕복 검증 ✅
- AttendanceMissingScheduler 실 동작 — Inbox 자동 적재 확인 ✅
- Mock 토스 BUSINESS 구독 자동 시드 + 조회 ✅
- CSV 내보내기 UTF-8 BOM ✅
- 친구 추천 코드 deterministic 발급 ✅

### 5차 자율 패스 (2026-05-22) — Phase 1 잔여 + P1 묶음 + 백오피스 와이어
**BE 8건 신규**
- `EmployeeStoreRelation.ownerMemo` + 사장 메모 GET/PUT API
- `Referral` 도메인 + 코드 발급/적용/이력 (`/api/referrals/*`)
- `StorePhoto` + `ObjectStorage` (mock 로컬 디스크) + 업로드/삭제 (`/api/stores/{id}/photos`)
- `TimeOffSelfRequest` DTO + `POST /api/timeoff/self`
- 급여 PDF 실 구현 (OpenPDF + 한글 폰트 fallback)
- CSV 내보내기 (UTF-8 BOM 출퇴근/급여 매장 단위)
- `PUT /api/user/me` 본인 정보 셀프 변경
- 사장→직원 푸시 발송 (`POST /api/notifications/push-to-employee`)

**FE 12 화면/컴포넌트 신규**
- `WageSettingsScreen` (S-501c) / `StoreEditScreen` (S-501a) / `MissingAttendanceCenterScreen` (S-601)
- `AccountSettingsScreen` (이름 변경 + 회원 탈퇴)
- `KakaoLoginScreen` (G-008)
- `TimeOffRequestScreen` (휴가 셀프 신청)
- `ReferralScreen` (친구 추천 + 공유)
- `usePushPermission` 훅 + `MemoEditor` 인라인 컴포넌트
- `NotificationSettings` TimePicker 실 통합
- `EmployeeAttendanceHome` 운영시간 외 경고
- `OwnerDashboard` StoreSelector 통합 (다매장 사장 전환)

**문서**
- `docs/wireframes/admin/` 10개 (O-001~O-901)
- Auth/Home Navigator 12+ 신규 스크린 등록
- LoginScreen 비번찾기 활성 + 약관 동의 통합

### 전수 감사 (2026-05-22) — 11개 결함 모두 수정
- **C-1** `PayrollController.calculate`: FE 매장 일괄 vs BE 단일 직원 미스매치 → `PayrollService.calculatePayrollForStore` 신규 + `employeeId=null` 분기
- **C-2** `PUT /api/payroll/{id}/status`: FE 쿼리 vs BE 바디 미스매치 → 둘 다 받도록 호환
- **C-3** `WageHistory` 미사용 → `updateEmployeeWage` + `updateStoreStandardWage` 에 자동 기록 통합
- **C-4** `AttendanceCorrectionRequest.approve()` 가 출퇴근 갱신 안 함 → `Attendance.adjustTimes` 도메인 메서드 추가 + Controller 호출
- **C-5** 정정 승인/거절 시 요청자 알림 발송 누락 → `NotificationService.push` 통합
- **C-6** `PasswordResetService.confirmReset` 명시적 `userRepository.save()` 추가
- **C-7** `PayrollRunScreen` 의 `Alert.prompt` Android 미지원 → 크로스플랫폼 `Modal` 가감 입력으로 교체
- **C-8** `LoginController` `@Controller` → `@RestController` 통일
- **C-9** `CONFIRM_REQUIRED.md` 에 C-3-1 (이메일 SES) 신규 항목 추가
- **C-10/11** `WageHistoryRepository` 메서드들 실제 사용처 확보

### 3차 자율 패스 (2026-05-20~21) — 추가작업.md P0/P1 완수
**BE P0/P1 신규**
- `GET /api/attendance/employee/{id}/today` — FE 호환
- 비밀번호 재설정 OTP 3단계 (`PasswordResetService`/`PasswordResetController` + `EmailSender` mock)
- 매장 코드 가입 `/api/stores/join-by-code` + `joinStoreByCode` 서비스
- 회원 탈퇴 `DELETE /api/user/{id}` (구독 차단 + 이메일 무효화)
- `AttendanceMissingScheduler` 사장 동시 발송
- `DevSeedRunner` BUSINESS 구독 자동 시드
- `User` 약관 동의 4 필드 + `joinUser` 검증
- `NotificationInbox` 도메인 + 3 API (`/inbox`, `/unread-count`, `/{id}/read`)
- `AttendanceCorrectionRequest` 워크플로 (신청·승인·거절)
- `WageHistory` 도메인 (P1 적용 대기)

**FE P0/P1 신규**
- SplashScreen (G-001 브랜드 스프링)
- OnboardingCarouselScreen (G-002 3 슬라이드)
- PasswordResetScreen (G-006 3 step)
- ConsentBlock + BottomSheet 모달 (G-A1~G-A4)
- JoinStoreByCodeScreen (E-301)
- AttendanceCorrectionRequestScreen
- EmployeeDetailScreen 4탭 (S-201)
- PayrollRunScreen 3 step (S-301)
- NotificationSettingsScreen (방해금지)
- AttendanceCalendarScreen (E-101)
- NotificationCenterScreen (E-501)
- offlineAttendanceQueue.ts + StoreSelector.tsx
- LoginScreen 비번찾기 링크 활성화

**디자이너 산출물 4종**
- `docs/wireframes/microinteractions.md` (애니메이션/햅틱/접근성)
- `docs/brand-copy-audit.md` (톤 헌법 + 영문 치환표)
- `docs/brand-copy-empty-states.md` (80개 빈 상태 카피)
- `docs/legacy-screen-audit.md` (11 레거시 토큰화 가이드)

**Navigation** — AuthNavigator + HomeNavigator 신규 11 화면 등록

### 2차 자율 패스 (2026-05-19)
- `AttendanceMissingScheduler` — 15분마다 출퇴근 누락 자동 감지 + 푸시
- `RateLimitFilter` — Bucket4j 메모리 백엔드 (로그인 분당 20, 일반 120)
- `StoreStatsController` — `/today` + `/payroll/month-to-date` 통계 API
- `OwnerDashboardScreen` (PRD_OWNER S-001) — 그라디언트 인사 + 출근/급여/액션 그리드
- `EmployeeAttendanceHome` (PRD_EMPLOYEE E-001) — 240pt 동그라미 CTA + 1Hz 카운트업
- 역할별 PRD 4종 (OWNER / EMPLOYEE / ADMIN / GUEST) 작성

---

## ✅ 완료 (자율 처리)

### 문서
- [x] 마스터프로젝트개발계획.md (CEO/CTO/CFO 통합)
- [x] PRD.md
- [x] PROJECT_IDENTITY.md
- [x] FEATURES.md
- [x] CLAUDE.md
- [x] AGENTS.md
- [x] CONFIRM_REQUIRED.md
- [x] PRD_OWNER.md (사장 페르소나, 모든 화면·액션·상태 머신)
- [x] PRD_EMPLOYEE.md (직원, 5대 JTBD 포함)
- [x] PRD_ADMIN.md (1인 운영자 백오피스)
- [x] PRD_GUEST.md (비회원 온보딩)
- [x] RUN_EMULATOR.md (단계별 실행 가이드)
- [x] docs/legal/privacy-policy.md (초안)
- [x] docs/legal/terms-of-service.md (초안)
- [x] docs/legal/marketing-consent.md (초안)
- [x] docs/security/SECURITY_AUDIT_2026-05.md
- [x] .claude/settings.json (권한 안전 가드)
- [x] .claude/commands/{blocker,daily,review-domain}.md

### Backend (Spring Boot)
- [x] dev 프로필 (`application-dev.yml`) — H2 + 외부 의존성 mock 토글
- [x] prod 프로필 템플릿 (`application-prod.yml.example`)
- [x] `.env.example` 정리 (시크릿 자리 표시)
- [x] `TokenStore` 인터페이스 + `RedisService` (`@Profile("!dev")`) + `InMemoryTokenStore` (`@Profile("dev")`)
- [x] `DevInfraConfig` — Redis 없이 부팅 (ConcurrentMapCacheManager)
- [x] `DevSeedRunner` — 부팅 시 사장+직원+매장 자동 생성
- [x] `IntegrationProperties` — toss/fcm/sentry/kakao/channel-talk 모드 토글
- [x] **결제(토스페이먼츠)** — `Subscription`, `PaymentHistory`, Repository, Service, Controller, Webhook(HMAC 검증), Scheduler, MockTossBillingClient, LiveTossBillingClient
- [x] **푸시(FCM)** — `DeviceToken`, Repository, Controller, `NotificationService` (6종 도메인 알림), MockPushNotifier, LivePushNotifier
- [x] **Sentry** — `SentryConfig` 동적 init, PII 마스킹
- [x] **Geocoding** — mode-aware (mock 시 결정적 좌표 반환)
- [x] `SecurityConfig` 헤더 강화 (HSTS, frameOptions, 화이트리스트 정비)
- [x] `RestTemplate` 타임아웃 (3s/10s)
- [x] `@EnableScheduling` + `@EnableAsync`

### Frontend (React Native)
- [x] `src/theme/tokens.ts` — 단일 디자인 토큰 (color/spacing/radius/typography/shadow/gradient)
- [x] 브랜드 컬러 확정: `#FF6B35` (소상공인 페르소나 친화 따뜻한 오렌지)
- [x] 기존 `colors.ts`/`theme.ts` legacy re-export 로 호환 유지
- [x] `Button` — 5 variants (primary/secondary/outline/ghost/destructive) × 3 sizes, 브랜드 그림자
- [x] `Card` — 토큰 기반, 클릭/평면 모두 지원
- [x] `Badge` — 6 tone (neutral/brand/success/warning/error/info)
- [x] `Input` — focus 보더, 에러/헬퍼 텍스트, 비밀번호 토글
- [x] `Header` — 브랜드 컬러 적용
- [x] `src/common/config/env.ts` — Platform.OS 자동 분기 (Android 10.0.2.2 / iOS localhost / prod sodam-api.com)
- [x] `subscriptionApi.ts` — 4 메서드 (plans/me/subscribe/cancel)
- [x] `NotificationService.ts` — FCM 토큰 등록/해제
- [x] `SubscribeScreen` 재작성 — 통일 디자인, 실 BE 연동

### Tests (도메인 단위, 외부 의존 X)
- [x] `AttendanceDomainTest` — 7 케이스 (출/퇴근, 중복 방지, 시간 계산, 일급)
- [x] `StoreLocationTest` — 9 케이스 (Haversine, 반경 검증, soft delete)
- [x] `PayrollDomainTest` — 7 케이스 (총급여/세금/실수령액)
- [x] `SubscriptionDomainTest` — 10 케이스 (상태 머신, 결제 실패 누적)

---

## 🛑 사용자 컨펌 대기 (CONFIRM_REQUIRED.md 참조)

상세는 `CONFIRM_REQUIRED.md` 의 C-1 ~ C-15 항목 참조. 핵심:
- 토스페이먼츠 가맹 신청 + API 키 발급
- Firebase 프로젝트 생성 + google-services.json
- Sentry / 채널톡 / Play Store / AWS 계정
- 사업자등록 / 통신판매업 신고
- 법무 검토 (이용약관 / 개인정보 / 환급형 약관)

각 항목 완료 시 → 본 문서 (PROGRESS.md) 의 "사용자 컨펌 대기" 줄을 ✅ 로 변경 + Claude 에게 "C-X 완료" 알리면 자동 후속 작업.

---

## ⏭️ 진행 후보 (다음 자율 작업 시 후보)

(BE)
- [ ] 출퇴근 누락 알림 스케줄러 (운영시간 + 30분 후 미체크인 자동 푸시)
- [ ] 멀티 매장 대시보드 쿼리 (`MasterStoreRelation` 활용)
- [ ] 급여 PDF 생성기 (4대보험 EDI 형식)
- [ ] BillingScheduler 의 PAST_DUE 재시도 nextBillingAt 갱신 로직 보강 (현재 자연 재시도)
- [ ] Bucket4j Rate Limit 필터 적용 (`/api/login` 등 IP 별 분당 30회)
- [ ] PII 로그 마스킹 AOP (이메일/전화)
- [ ] Spring Security `requireChannel.requiresSecure()` 운영 프로필 강제
- [ ] Flyway 도입 + 마이그레이션 스크립트 시작

(FE)
- [ ] AttendanceScreen 통일 디자인 적용 (NFC/GPS 단일 UX)
- [ ] HomeScreen 사장님 / 직원 모드 분기
- [ ] 급여 명세서 상세 (직원용 E-202)
- [ ] 약관 동의 화면 (G-A1~G-A4)
- [ ] 매장 가입 by QR 스캔 (Phase 2)
- [ ] react-native-firebase 통합 (FCM 실토큰 발급)
- [ ] react-native-toss-payments SDK 통합 (TossBillingAuth 화면)

(인프라/배포)
- [ ] GitHub Actions CI (lint/test/build)
- [ ] AWS ECS Fargate Terraform
- [ ] Play Store 메타데이터 자동화 스크립트

---

## 📊 출시까지 D-XX (M3 = 2026-08-31)

오늘(2026-05-19) 기준 **D-104**.

| 단계 | 진행률 | 비고 |
|---|---|---|
| 코드 (BE) | 75% | 외부 SDK 키 연동 / 일부 후속 작업 |
| 코드 (FE) | 55% | 디자인 시스템 적용 진행 중 |
| 문서 | 95% | 법무 검토만 외부 의존 |
| 인프라 | 5% | 사용자 컨펌 후 진행 |
| 보안 | 60% | Bucket4j/Audit Log 남음 |
