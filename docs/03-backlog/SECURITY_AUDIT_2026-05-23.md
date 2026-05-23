# 보안 전수 감사 보고서 — 2026-05-23

> **결론**: 출시 차단(P0) 8건, 30일 내 보강(P1) 6건, 개선(P2) 5건. 현 상태로 출시 시 **권한 escalation·다른 사장 데이터 노출·운영 디버그 엔드포인트 노출** 등 1차 사고 위험 매우 큼.

---

## 🚨 P0 — 출시 차단 (모두 fix 필수)

### P0-1. RBAC 어노테이션 0건 — 인증된 누구나 모든 endpoint 호출 가능
- **범위**: 26 컨트롤러 / 175 엔드포인트 전수
- **현상**: `@PreAuthorize`, `@Secured`, `hasRole`, `hasAuthority` 사용 **0건**. `@EnableMethodSecurity` 어노테이션도 없음. `SecurityConfig`의 `anyRequest().authenticated()` 뒤로 권한 매트릭스가 없음.
- **결과**: EMPLOYEE 가 `/api/master/*`, `/api/timeoff/{id}/approve`, `/api/wage/*` 등 사장 전용 endpoint 호출 가능. PERSONAL 사용자도 동일.
- **fix**: 
  1. `SecurityConfig` 에 `@EnableMethodSecurity` 추가
  2. 사장 전용 컨트롤러에 클래스 레벨 `@PreAuthorize("hasRole('MASTER')")`
  3. 직원/사장 공통은 메서드 레벨로 세분화

### P0-2. `/api/timeoff/{id}/approve` — 직원 본인이 자기 휴가 승인 가능
- **위치**: `backend/.../controller/TimeOffController.java:128-141`
- **현상**: approve/reject 메서드에 권한 어노테이션·소속 매장 검증 없음. 인증된 누구나 timeOffId 만 알면 호출 가능.
- **fix**: 사장 권한 검증 + 해당 timeOff 가 사장의 매장 소속인지 ownership check 필수.

### P0-3. `/api/timeoff` (POST) — 다른 사람 이름으로 휴가 신청 가능
- **위치**: `TimeOffController.java:50-71` (paramater 기반 + JSON 기반 모두)
- **현상**: `employeeId` 를 request body/query 로 받음. principal 검증 없음.
- **fix**: `/self` 변형만 남기고 두 메서드 제거 또는 사장 권한으로 제한.

### P0-4. `/api/timeoff/store/{storeId}` — 임의 매장 휴가 목록 조회
- **위치**: `TimeOffController.java:76-92, 104-116`
- **현상**: 매장ID 만 알면 임의 매장의 휴가 데이터 조회. 다른 사장의 매장도 조회 가능.
- **fix**: storeId 가 principal 의 소유 매장 또는 소속 매장인지 검증.

### P0-5. `/api/test/**` — 운영 환경에 디버그 컨트롤러 노출
- **위치**: `TestController.java`
- **현상**: `@Hidden` (Swagger 숨김) 처리만 됨. SecurityConfig 에서 차단 안 됨. 5개 엔드포인트 노출 (성공/실패/예외 테스트용).
- **fix**: `@Profile("dev")` 추가 OR `application-prod.yml` 에서 spring component scan 제외.

### P0-6. `/api/billing/webhook/**` — HMAC 검증 코드 실재 여부 미확정
- **위치**: `TossWebhookController.java`
- **현상**: SecurityConfig 에서 permitAll. 주석으로 "HMAC 자체 검증"이라 적혀있으나 실제 검증 코드 동작 여부 미확인. `IntegrationProperties.Toss.webhookSecret` 기본값이 `"dev-webhook"` (평문 디폴트).
- **fix**: HMAC 검증 단위테스트 작성 + webhookSecret 기본값을 빈 문자열로 변경 후 빈 값이면 거부.

### P0-7. `MasterController` 14개 endpoint — 사장 전용인데 권한 없음
- **위치**: `MasterController.java` 전체
- **현상**: 매장 통계/직원 명단/급여 발행/구독 관리 등 사장 전용 API 14개. `principal` 미사용 + RBAC 미적용.
- **fix**: 클래스 레벨 `@PreAuthorize("hasRole('MASTER')")` + storeId 별 ownership check.

### P0-8. `WageController`, `PayrollController` — 시급/급여 임의 변경 가능
- **위치**: `WageController.java` (5 endpoints), `PayrollController.java` (10 endpoints)
- **현상**: 시급 변경/급여 계산 trigger 가 권한 어노테이션 없음. 직원이 자기 시급 변경 가능.
- **fix**: 변경(POST/PUT) 은 MASTER 전용. 조회(GET) 는 본인 또는 소속 매장의 사장만.

---

## ⚠️ P1 — 30일 내 보강

### P1-1. `IntegrationProperties` 평문 default secret
- `Toss.webhookSecret = "dev-webhook"`, `Toss.secretKey = "test_sk_dev"` 하드코딩.
- 운영에서 환경변수 미주입 시 평문 default 가 그대로 사용됨.
- **fix**: default 를 빈 문자열로 + Live 모드 진입 시 빈 값 검증.

### P1-2. `@Valid` 사용 21회 / 175 endpoint — 입력 검증 부족
- 11/26 컨트롤러만 적용. 나머지는 검증 없이 raw 데이터 처리.
- **fix**: 모든 `@RequestBody` 에 `@Valid` + DTO 에 Bean Validation 어노테이션 (`@NotNull`, `@Size`, `@Pattern`) 부여.

### P1-3. `/api/info/**` permitAll — 정적 콘텐츠 검증 미흡
- 정책/팁 정보 등 비인증 조회. 응답 DTO 에 내부 메타데이터 포함될 가능성 점검 필요.
- **fix**: `PolicyInfo`, `TipInfo`, `TaxInfo`, `LaborInfo` 응답 DTO 의 필드를 출시용 응답 DTO 로 한정.

### P1-4. `/h2-console/**` SecurityConfig permitAll
- application.yml 에서 dev 프로필만 h2.console.enabled=true 이면 안전. 운영 자동 차단 메커니즘 보강 필요.
- **fix**: SecurityConfig 에 `@Profile("!prod")` Conditional 적용.

### P1-5. CSRF disabled + 쿠키 인증 병행
- JWT cookie (`sodam_jwt`) 가 application.yml 에 정의됨 → 쿠키 인증 경로면 CSRF 위험.
- **fix**: 쿠키 인증 전부 제거하고 Authorization 헤더만 사용 OR SameSite=Strict + CSRF 토큰 도입.

### P1-6. Rate limit 적용 범위 부족
- `RateLimitFilter` 는 `/actuator`, `/h2-console` 만 제외. 로그인/비번재설정 등 brute-force 가능 endpoint 별도 분당 제한 강화 필요.
- **fix**: `/api/login`, `/api/auth/password-reset/**` 에 IP/계정별 5회/분 제한.

---

## 📋 P2 — 개선

### P2-1. JWT 토큰 만료 시간이 docker-compose 환경변수에서 ms 단위
- `JWT_EXPIRATION: 3600000` (1시간), `JWT_REFRESH_EXPIRATION: 604800000` (7일).
- 운영 권장: access 15분 / refresh 7~14일 + sliding refresh.

### P2-2. SecurityConfig 의 `frameOptions(sameOrigin)` 은 H2 콘솔용 — 운영 자동 비활성 권장
- **fix**: 프로필별 분리 — prod 는 `frameOptions.deny()`.

### P2-3. CORS 설정 분리 미흡
- `WebConfig` 에서 CORS 처리하지만 운영 도메인 white-list 명시 확인 필요.

### P2-4. PerformanceConfig 가 메모리/스레드 정보를 INFO 레벨로 주기적 로깅
- 정상 운영 정보지만 운영 모니터링 도구(Sentry/CloudWatch)와 중복. 로그 비용 증가.
- **fix**: prod 에서 DEBUG 레벨로 강등.

### P2-5. Actuator `/actuator/info` permitAll
- 빈 응답이지만 응답 자체로 BE 존재 확인 가능. 운영에서는 인증 뒤로 옮기는 것을 검토.

---

## ✅ 발견된 정상 영역 (OK)

- BCrypt 사용 — `SecurityConfig.passwordEncoder()`
- JWT 서명 비밀키 환경변수 주입 (`SODAM_JWT_SECRET`, application.yml `${JWT_SECRET:#{null}}`)
- JWT 토큰 로깅 마스킹 — `JwtAuthenticationFilter.maskToken()` (앞 10자만)
- STATELESS 세션 정책 (JWT 표준)
- HSTS 1년 (`SecurityConfig.headers.httpStrictTransportSecurity`)
- Native SQL query 사용 0건 — JPA only (SQL injection 위험 낮음)
- 코드에 하드코딩된 password/secret/apiKey 0건 (단 `IntegrationProperties` default 값 제외 — P1-1)
- 비밀번호 reset 토큰 별도 도메인 + 만료 처리 (`PasswordResetToken`)

---

## 🎯 권장 fix 순서

1. **#1 (1시간)**: `@EnableMethodSecurity` 추가 + 컨트롤러 클래스 레벨 `@PreAuthorize` 일괄 부여 (사장/직원/공통 3종)
2. **#2 (2시간)**: `TimeOffController` / `MasterController` / `WageController` / `PayrollController` ownership check
3. **#3 (30분)**: `TestController` 에 `@Profile("dev")` 추가
4. **#4 (1시간)**: `TossWebhookController` HMAC 검증 단위 테스트 + 평문 default 제거
5. **#5 (1시간)**: `/api/login`, `/api/auth/password-reset/**` Rate limit 강화
6. **#6 (2시간)**: 모든 `@RequestBody` 에 `@Valid` + DTO Bean Validation

총 **8시간** 예상. P0 우선 처리 후 즉시 재테스트.

---

## 📊 검사 통계
- 검사 컨트롤러: **26 개** (전수)
- 검사 엔드포인트: **175 개**
- 발견 P0: 8건, P1: 6건, P2: 5건 (총 19건)
- 검사 시각: 2026-05-23
- 검사 방법: SecurityConfig 코드 리뷰 + grep 매트릭스 (RBAC/Principal/Valid/Native SQL/시크릿 로깅)
