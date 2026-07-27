# 02. API 활용 계획

[01_시스템아키텍처.md](01_시스템아키텍처.md) §3의 하이브리드 원칙에 따라, 도메인별로 기존 API 재사용 여부와 신규 BFF 필요 여부를 분류한다.

범례: **R** = 기존 API 그대로 재사용 · **B** = Next.js Route Handler(BFF)에서 집계/가공 · **N** = Spring `/api/web/**` 신규 엔드포인트 필요

## 1. 인증 (전량 신규 — 웹 전용 세션 배선)

| 기능 | 분류 | 엔드포인트(안) | 비고 |
|---|---|---|---|
| 로그인(이메일) | N | `POST /api/web/auth/login` | 세션 발급, 기존 `/api/login`(JWT용)과 별도. **사장과 매니저(위임받은 Employee) 모두 동일 엔드포인트로 로그인** — 이후 세션에 담긴 storeRole/권한에 따라 메뉴·API 접근이 제한된다(신규 역할 분기 엔드포인트를 따로 만들지 않음) |
| 카카오/Apple 로그인 | N | `POST /api/web/auth/kakao`, `/api/web/auth/apple` | 콜백 후 세션 발급 |
| 로그아웃 | N | `POST /api/web/auth/logout` | Redis 세션 삭제 |
| 세션 확인 | N | `GET /api/web/auth/me` | 미들웨어에서 페이지 접근 제어용 |
| 회원가입 | R | `POST /api/join` | 가입 로직 자체는 인증방식 무관, 재사용 |

## 2. 매장 관리

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 매장 등록 | R | `POST /api/stores/registration` |
| 매장 목록/상세/수정/삭제 | R | `GET/PUT/DELETE /api/stores/{id}` |
| 매장별 통계 | R | `GET /api/stores/{storeId}/stats`, `StoreStatsController` 일체 |
| 운영시간 조회/수정 | R | `GET/PUT /api/stores/{storeId}/operating-hours` |
| NFC 태그 목록/비활성화 | R | `GET/PATCH/DELETE /api/stores/{storeId}/nfc-tags` (**발급 `POST`는 웹에서 호출하지 않음 확정** — 물리 태그 쓰기는 모바일 NFC 하드웨어 전용, [00](00_개요_및_요구사항정의서.md) §7 참고) |
| 매장 사진 CRUD | R | `StorePhotoController` |
| **대시보드 요약(오늘 출퇴근+대기승인+매출+알림)** | **B** | Next.js `GET /api/bff/dashboard` — 내부에서 출퇴근현황·승인대기·통계·타임오프 API 4~5개를 병렬 fetch 후 단일 payload로 합성 |

## 3. 직원 관리·계약

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 직원 목록/상세/수정/비활성화 | R | `GET/PUT /api/user/{id}`, `PUT /api/stores/{storeId}/employees/{id}/active` |
| 시급/월급 변경(DRAFT~APPLIED) | R | `WageController` 일체 — 변경안 상태기계는 백엔드 그대로 |
| 근로계약 전자서명 발송/상태 | R | `LaborContractController`, `ElectronicSignatureController` |
| **직원 목록 + 최신 급여 + 계약상태를 합친 테이블 뷰** | **B** | 대시보드형 직원관리 화면은 3개 API 병렬 호출 후 BFF에서 합성 |

## 4. 출퇴근

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 매장 출퇴근 현황 조회 | R | `GET /api/attendance/store/{storeId}` |
| 사장승인 요청 목록/승인/거절 | R | `AttendanceApprovalController` |
| 이상탐지 목록/처리(waive/deduct/convert) | R | `AttendanceIrregularityController` |
| 정정요청 승인/거절 | R | `AttendanceCorrectionController` |
| 수기 등록 | R | `POST /api/attendance/manual-register` |
| **실시간 현황판(폴링 대체 스트림)** | R(WebSocket) | 기존 STOMP 토픽 재사용, REST 신규 불필요 |

## 5. 스케줄

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 시프트 CRUD | R | `WorkShiftController` |
| 확정 알림 발송 | R | `POST /api/stores/{storeId}/shifts/notify` |
| 템플릿 CRUD/적용 | R | `ShiftTemplateController` |
| 교대요청 승인 | R | `ShiftSwapController` |
| 연차/휴무 승인 | R | `TimeOffController` |
| **드래그앤드롭 보드 초기 로드(주간 시프트+직원+템플릿 동시 필요)** | **B** | 편집 보드 첫 진입 시 3개 API를 하나로 묶어 초기 렌더 지연 최소화 |

## 6. 급여

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 급여 계산/상태변경/발급 | R | `PayrollController` |
| 급여 정책 조회/설정 | R | `PayrollPolicyController` |
| 보너스 등록/조회 | R | `PayrollBonusController` |
| PDF 다운로드 | R | `GET /api/payroll/{id}/pdf` |
| **정산 마법사(3단계: 대상선정→계산확인→발급) 단일 트랜잭션 요약** | **N** | `POST /api/web/payroll/wizard/preview`, `POST /api/web/payroll/wizard/confirm` — 웹은 여러 직원을 한 화면에서 일괄 검토하는 UX라 트랜잭션 경계를 백엔드에서 묶는 편이 정합성에 유리 ([05](05_동시성제어_및_고급아키텍처.md) §5 참고) |

## 7. 매니저 위임

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 매니저 목록/부여/회수 | R | `ManagerController` |
| 위임 감사이력 조회 | R | `GET /api/stores/{storeId}/delegation-audit` |

⛔ `CONTRACT_MANAGE`/`PAYROLL_CONFIRM` 권한 부여 UI는 웹에서도 신규 노출·확장하지 않는다 (CLAUDE.md 노무사 게이트 원칙, [00](00_개요_및_요구사항정의서.md) 및 [README](README.md) §4 참고).

## 8. 구인채용

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 구인공고 CRUD | R | `JobPostingController` |
| 지원자 목록/응답 | R | `JobApplicationController` |
| 인증 구직자 매칭 조회 | R | `JobSeekerController` |

## 9. 구독/결제

| 기능 | 분류 | 기존/신규 엔드포인트 |
|---|---|---|
| 플랜 조회/구독/해지/일시정지 | R | `SubscriptionController` |
| Toss 웹훅 | R | `TossWebhookController` — 변경 없음(HMAC 자체검증, permitAll 유지) |

## 10. 에러 처리 및 버전 정책

- **에러 포맷은 기존 `GlobalExceptionHandler` 규격을 그대로 따른다** — `errorCode` 필드 포함, 컨트롤러 try-catch 임의 응답 금지 원칙은 신규 `/api/web/**` 컨트롤러에도 동일 적용 ([api-design.md](../../.claude/rules/api-design.md) 준수).
- 인증 실패 401 / 권한부족 403 구분 원칙은 세션 기반 인증에도 동일 적용 — 세션 만료 시 401을 반환해 Next.js 미들웨어가 로그인 페이지로 리다이렉트하도록 한다.
- 신규 `/api/web/**` 네임스페이스는 자체 버전을 갖지 않고 기존 API와 동일한 배포 주기를 따른다(별도 API 버전관리 체계 도입 안 함 — 과설계 방지).
- Next.js BFF(Route Handlers)는 외부에 노출되는 공개 API가 아니므로 OpenAPI 문서화 대상에서 제외하고, 신규 Spring `/api/web/**`만 springdoc(`@Operation`,`@Tag`)으로 문서화한다.
- Rate limit(Bucket4j)이 걸린 기존 엔드포인트 설정은 웹 트래픽 유입으로 인해 임의로 완화하지 않는다 — 웹 전용 엔드포인트에는 로그인 브루트포스 방지를 위한 별도 rate limit을 신설한다 ([04_보안정책.md](04_보안정책.md) §4).

## 11. 확정 (2026-07-26, 2차 확인)

- 대시보드 BFF 응답시간 측정 시점: [08_개발로드맵.md](08_개발로드맵.md) Phase 1 완료 기준에 명시 — Phase 1에서 실측 후 목표(P95 800ms) 초과 시 Spring `/api/web/dashboard/summary` 집계 엔드포인트로 전환.
- 급여 정산 마법사 BFF는 Spring `/api/web/**`에 두는 설계를 유지한다. `PayrollController.calculate`가 이미 원자적 트랜잭션인지는 구현 착수 시 코드 레벨로 재확인하되(구현 세부사항이라 이 문서 단계에서 결론 낼 사안 아님), 설계 방향 자체는 "여러 직원을 한 화면에서 일괄 검토·확정하는 웹 UX는 트랜잭션 경계를 백엔드가 갖는 편이 안전하다"는 원칙을 그대로 따른다.
