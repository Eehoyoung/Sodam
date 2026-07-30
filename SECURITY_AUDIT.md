# SECURITY_AUDIT

- 감사일: 2026-07-30
- 최종 판정: **CONDITIONAL PASS**
- 범위: 현재 로컬 저장소와 로컬 테스트 환경만. 운영 서버, 실제 사용자 데이터, 제3자 API, 배포, push, commit은 사용하지 않았다.
- 제외: 외부 CVE DB 조회(`npm audit` 등), 실제 Kakao/SMTP/Toss/S3 호출, 운영 MySQL/Flyway 적용, 실제 업로드 저장소, Android 에뮬레이터 E2E.

## 프로젝트 보안 구조

- Backend: Spring Boot 3.4.5 / Java 17, JWT stateless API와 별도 웹 콘솔 세션 체인.
- 권한: `UserPrincipal`의 토큰 주체와 `StoreAuthorizationPolicy`가 매장 소유·직원 소속·본인 여부를 검사한다.
- 데이터: prod는 MySQL/Flyway, Redis는 JWT/cache와 OAuth state에 사용한다. test/dev는 H2 및 메모리 대체 구현을 사용한다.
- Frontend: React Native. 카카오 로그인은 앱 deep link, 토큰은 로컬 스토리지, API는 Axios client를 통해 호출한다.
- 외부 연동: Kakao OAuth/지오코딩, SMTP, Toss, FCM, S3가 설정 기반으로 활성화된다. 이번 감사에서는 호출하지 않았다.

## 기존 상태 보존

- 감사 시작 전 변경: `frontend/src/features/auth/components/PurposeSelectModal.tsx` 삭제와 여러 untracked 로컬 산출물/스크립트가 있었다. 관련 파일을 되돌리거나 수정하지 않았다.
- 시작 전 검증: backend `gradlew.bat test` 통과, frontend lint는 오류 0·경고 1030개, frontend unit test는 통과 상태였다.

## 발견 사항 요약

| ID | 위험도 | 상태 | 요약 |
|---|---|---|---|
| SEC-AUD-001 | Critical | 수정 | 전역 MASTER가 임의 개인 사용자 리소스를 읽거나 변경 가능 |
| SEC-AUD-002 | Critical | 수정 | 레거시 출퇴근 API가 요청의 `employeeId`를 호출자와 대조하지 않음 |
| SEC-AUD-003 | Critical | 수정 | 증거 패키지가 매장 밖 직원의 급여·개인정보를 조회 가능 |
| SEC-AUD-004 | Critical | 수정 | 전역 MASTER가 임의 `/api/user/{userId}` PII를 조회 가능 |
| SEC-AUD-005 | High | 수정 | Kakao OAuth state가 서버 발급·일회성 검증되지 않아 login CSRF 가능 |
| SEC-AUD-006 | High | 수정 | refresh/reset bearer credential이 DB에 평문 저장 |
| SEC-AUD-007 | High | 수정 | 개인 근무지·고객 문의 PII가 평문 저장 |
| SEC-AUD-008 | High | 수정 | OTP, 이메일, 주소·좌표, 토큰 일부가 로그에 남을 수 있음 |
| SEC-AUD-009 | High | 수정 | prod compose가 알려진 기본 시크릿과 mock mail로 기동 가능 |
| SEC-AUD-010 | High | 수정 | prod CORS가 localhost 개발 origin을 credentials와 함께 허용 |
| SEC-AUD-011 | Medium | 수정 | 매장 STOMP 토픽 SUBSCRIBE에 매장 소속 검사 없음 |
| SEC-AUD-012 | Medium | 수정 | 지오코딩 실패/응답 로그에 주소·좌표가 남음 |
| SEC-AUD-013 | Medium | 수정 | 미성년 근로 보호 조회가 대상 직원의 매장 소속을 확인하지 않음 |

## 상세 결과

### SEC-AUD-001 — Critical — 개인 사용자 IDOR

- 관련 파일과 함수: `personal/controller/PersonalUserController.java`, `verifyAccess`.
- 문제의 코드 경로: 모든 `/api/personal-users/{userId}` 경로가 토큰 주체가 달라도 `ROLE_MASTER`면 통과했다.
- 필요한 공격 조건: 다른 매장 소유 MASTER의 유효 JWT와 대상 userId.
- 예상 영향: 개인 프로필, 근무지, 세무·출퇴근 정보를 교차 매장 조회·변경.
- 검증 결과: 회귀 테스트를 기존 구현에 적용했을 때 403이 아닌 서비스 호출 경로가 확인됐다.
- 수정 내용: 역할 예외를 제거하고 토큰 주체 자신만 허용했다.
- 추가한 테스트: `PersonalUserControllerTest`의 타인 userId 403 및 서비스 미호출 검증.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

### SEC-AUD-002 — Critical — 레거시 출퇴근 대리 기록

- 관련 파일과 함수: `controller/LegacyAttendanceProxyController.java`, `legacyCheckIn`, `legacyCheckOut`.
- 문제의 코드 경로: 요청 body의 `employeeId`를 그대로 출퇴근 서비스에 전달했다.
- 필요한 공격 조건: 로그인한 직원이 다른 직원 ID와 유효한 위치 입력을 전송.
- 예상 영향: 타인 출퇴근·급여 원장 변조.
- 검증 결과: 현대 `/api/attendance` 경로와 달리 레거시 프록시에 본인 가드가 없었다.
- 수정 내용: `StoreAuthorizationPolicy.assertSelf`를 서비스 호출 전에 추가했다.
- 추가한 테스트: `LegacyAttendanceProxyControllerTest`의 check-in/check-out 타인 ID 거부.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 위치 검증의 정확도는 별도 도메인 정책 범위다.

### SEC-AUD-003 — Critical — 증거 패키지 교차 매장 급여 노출

- 관련 파일과 함수: `EvidencePackageController.evidence`, `EvidencePackageService.payrollSummary`, `PayrollRepository`.
- 문제의 코드 경로: 요청 매장 소유만 확인한 뒤 전역 `employeeId` 급여 조회를 수행했다.
- 필요한 공격 조건: 아무 매장이나 소유한 MASTER가 다른 매장 직원 ID를 지정.
- 예상 영향: 타 매장 급여·공제·근무 증거와 PII 노출.
- 검증 결과: 사전 회귀 테스트가 기존 구현에서 실패했다.
- 수정 내용: 대상 직원의 요청 매장 소속을 검사하고 급여 repository query에 `storeId` 조건을 추가했다.
- 추가한 테스트: `EvidencePackageControllerTest`, `EvidencePackageServiceTest`.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

### SEC-AUD-004 — Critical — 전역 MASTER 사용자 PII 조회

- 관련 파일과 함수: `controller/UserController.getUserById`.
- 문제의 코드 경로: 전역 `ROLE_MASTER`만으로 `/api/user/{userId}`를 허용했다.
- 필요한 공격 조건: 다른 매장 MASTER의 JWT와 대상 userId.
- 예상 영향: 이메일, 전화번호, 생년월일, 동의 상태 등 `UserResponseDto` PII 노출.
- 검증 결과: `hasManagerRole`이 매장 관계 없이 참이었다.
- 수정 내용: 타인 조회 시 `assertCanViewEmployee(principalId, userId, isMaster)`를 try 밖에서 강제했다.
- 추가한 테스트: `UserControllerTest`의 교차 매장 MASTER 차단.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 사용자 ID와 직원 프로필 ID의 도메인 매핑 변경 시 이 권한 계약을 함께 검토해야 한다.

### SEC-AUD-005 — High — Kakao login CSRF

- 관련 파일과 함수: `LoginController`, `KakaoAuthService`, `KakaoOAuthStateService`, `KakaoLoginScreen`, auth API/service/hook/context.
- 문제의 코드 경로: `/kakao/auth/proc`가 없거나 임의의 state를 경고만 남기고 code 교환했다.
- 필요한 공격 조건: 공격자 자신의 Kakao authorization code callback URL을 피해 앱/브라우저로 유도.
- 예상 영향: 피해자가 공격자 계정으로 로그인되어 오입력·개인정보 혼선 발생.
- 검증 결과: 서버 저장 state 및 client callback 대조가 없고 frontend authorization URL도 state를 넣지 않았다.
- 수정 내용: 서버가 Redis(prod)/in-memory(dev,test)에 5분 TTL, 1회성 state+PKCE verifier digest를 저장한다. callback은 state와 `X-Kakao-OAuth-Code-Verifier`가 모두 일치해야 code exchange를 수행하며, client는 일치하는 pending transaction만 처리한다.
- 추가한 테스트: `KakaoOAuthStateServiceTest`, `LoginControllerKakaoSecurityTest`, frontend `kakaoLoginScreen.test.ts`의 일치·불일치·cold-start 경로.
- 수정 후 검증 결과: 재사용/불일치/missing state가 차단되고 정상 pending state callback 테스트가 통과했다.
- 남은 위험: Kakao 실제 앱 등록의 PKCE 지원·redirect URI 조합은 외부 호출 금지로 E2E 미검증이다.

### SEC-AUD-006 — High — bearer token 평문 저장

- 관련 파일과 함수: `RefreshToken`, `RefreshTokenService`, `RefreshTokenRepository`, `PasswordResetToken`, `PasswordResetService`, repository들, `BearerTokenHasher`.
- 문제의 코드 경로: refresh token과 password-reset ticket이 DB unique column에 원문으로 저장·조회됐다.
- 필요한 공격 조건: DB read 권한 또는 백업 유출.
- 예상 영향: 활성 refresh token(최대 7일) 또는 reset ticket(최대 5분) 재사용을 통한 계정 탈취.
- 검증 결과: entity의 token/reset ticket 원문 저장과 exact-value repository lookup을 확인했다.
- 수정 내용: `jwt.secret` 기반 HMAC-SHA-256 digest만 저장하고, 입력 bearer 값도 같은 digest로 조회한다. raw 값은 발급 응답 직전 메모리에만 둔다.
- 추가한 테스트: `RefreshTokenServiceSecurityTest`, `PasswordResetServiceSecurityTest`.
- 수정 후 검증 결과: 저장값이 raw와 다르고 digest lookup만 수행됨을 검증했다. 기존 raw DB 행은 새 lookup으로 인증되지 않는다.
- 남은 위험: 이미 존재하는 raw 값은 만료/정리 전 DB·백업에는 남는다.

### SEC-AUD-007 — High — PII 평문 저장

- 관련 파일과 함수: `personal/domain/PersonalWorkplace`, `domain/CustomerInquiry`, `IntegerCryptoConverter`, `V68__encrypt_personal_workplace_and_customer_inquiry_pii.sql`.
- 문제의 코드 경로: 근무지 이름·주소·시급과 고객 문의 이름·이메일·본문에 암호화 converter가 없었다.
- 필요한 공격 조건: DB 또는 백업 읽기 권한.
- 예상 영향: 개인 근무·임금·문의 PII 원문 노출.
- 검증 결과: 해당 entity column에 `StringCryptoConverter`가 적용되지 않은 것을 확인했다.
- 수정 내용: 문자열은 AES-GCM converter, 시급은 새 Integer converter로 암호화하고 ciphertext 길이를 위한 Flyway V68 컬럼 확장을 추가했다.
- 추가한 테스트: `SensitiveDomainPiiEncryptionTest`.
- 수정 후 검증 결과: 민감 필드 converter 선언과 시급 ciphertext round-trip 테스트가 통과했다.
- 남은 위험: 기존 평문 행은 안전한 별도 backfill 전까지 평문이다.

### SEC-AUD-008 — High — 민감 로그 및 mock OTP 노출

- 관련 파일과 함수: `GeocodingService`, `MockEmailSender`, `SmtpEmailSender`, `MockPushNotifier`, `LivePushNotifier`, `CustomUserDetailsService`, `KakaoAuthService`, JWT classes, `LoginController`.
- 문제의 코드 경로: 주소·좌표, OAuth 이메일, OTP·메일 본문, 알림 본문, token 일부가 로그 인자였다.
- 필요한 공격 조건: 애플리케이션 로그 읽기 권한.
- 예상 영향: PII, 위치, 인증 비밀 유출.
- 검증 결과: mock mail sender가 reset OTP를 INFO로 기록했고 geocoding이 응답 본문·주소를 기록했다.
- 수정 내용: raw 값·본문·예외 메시지 로그를 제거하고 userId, 유형, count, masked recipient만 기록하게 했다.
- 추가한 테스트: `GeocodingServiceTest`, `MockEmailSenderSecurityTest`.
- 수정 후 검증 결과: 주소·좌표 및 OTP·원문 이메일이 로그에 없음을 검증했다.
- 남은 위험: 기존 배포 로그 보존본은 본 패치로 삭제되지 않는다.

### SEC-AUD-009 — High — compose prod known/default secret 및 mock mail

- 관련 파일과 함수: `docker-compose.yml`, `.env.example`, `IntegrationProperties`, `SmtpEmailSender`.
- 문제의 코드 경로: prod compose가 알려진 JWT/PII/DB 기본값 및 기본 mock mail 설정으로 기동 가능했다.
- 필요한 공격 조건: 누락된 환경변수로 compose 실행.
- 예상 영향: JWT 위조, PII 키 노출, DB 접근 또는 reset OTP 로그 노출.
- 검증 결과: 구성 파일의 interpolation default 및 mail mode default를 확인했다.
- 수정 내용: DB/JWT/PII/pepper/SMTP host/from을 compose required interpolation으로 바꾸고 prod compose mail mode를 live로 고정했다.
- 추가한 테스트: local `docker compose config --quiet` missing-secret reject 및 dummy-value accept 검증.
- 수정 후 검증 결과: 필수 값 미설정은 거부, 비밀이 아닌 검증용 값을 명시하면 config가 통과했다.
- 남은 위험: 실제 SMTP/TLS/DKIM 구성은 운영 배포 전 별도 검증이 필요하다.

### SEC-AUD-010 — High — prod CORS localhost credential 허용

- 관련 파일과 함수: `config/WebConfig`.
- 문제의 코드 경로: 활성 프로필과 무관하게 localhost/Metro origin이 `/api/**`에 credentials와 함께 허용됐다.
- 필요한 공격 조건: 사용자 장비의 허용된 localhost origin에서 악성 웹 콘텐츠 실행 및 유효 cookie/session 조건.
- 예상 영향: 브라우저 기반 교차 출처 요청 위험 확대.
- 검증 결과: `DEV_ORIGINS`가 무조건 `CorsConfiguration`에 추가됐다.
- 수정 내용: dev/test에서만 개발 origin을 추가하고 prod는 `SODAM_CORS_ALLOWED_ORIGINS`의 명시 origin만 사용한다.
- 추가한 테스트: `WebConfigSecurityTest`.
- 수정 후 검증 결과: prod localhost 거부 및 명시 origin 허용, dev localhost 허용을 검증했다.
- 남은 위험: prod 배포 시 실제 web console origin을 반드시 환경변수에 넣어야 한다.

### SEC-AUD-011 — Medium — STOMP store topic BOLA

- 관련 파일과 함수: `security/web/StompAuthChannelInterceptor`, `WebSocketConfig`.
- 문제의 코드 경로: CONNECT만 인증하고 `/topic/store.{storeId}` SUBSCRIBE의 store membership을 확인하지 않았다.
- 필요한 공격 조건: 유효 JWT/웹 세션으로 STOMP 연결 후 다른 store topic 구독.
- 예상 영향: 매장 변경 이벤트 metadata 노출 및 polling 유도.
- 검증 결과: interceptor가 CONNECT 외 command를 무조건 통과시켰다.
- 수정 내용: store topic SUBSCRIBE마다 principal ID와 destination storeId로 `assertMemberOfStore`를 실행한다.
- 추가한 테스트: `StompAuthChannelInterceptorTest`.
- 수정 후 검증 결과: 비소속 store subscription이 거부된다.
- 남은 위험: native/web 실제 broker E2E는 이번 로컬 단위 검증 범위 밖이다.

### SEC-AUD-012 — Medium — 지오코딩 위치 로그

- 관련 파일과 함수: `service/GeocodingService.liveGeocode`, `mockGeocode`.
- 문제의 코드 경로: Kakao 응답 객체, 입력 주소, 위도·경도를 debug/warn/error에 남겼다.
- 필요한 공격 조건: 로그 읽기 권한 및 지오코딩 요청 발생.
- 예상 영향: 매장·구직 희망지 위치 PII 노출.
- 검증 결과: 사전 회귀 테스트가 raw address log 때문에 실패했다.
- 수정 내용: document count와 실패 class만 기록하고 외부 오류/사용자 메시지에서 주소를 제거했다.
- 추가한 테스트: `GeocodingServiceTest.liveGeocode_doesNotWriteAddressOrCoordinatesToLogs`.
- 수정 후 검증 결과: 테스트 통과.
- 남은 위험: 기존 로그 보존본은 별도 로그 보존 정책으로 처리해야 한다.

### SEC-AUD-013 — Medium — 미성년 근로 보호 정보 교차 매장 조회

- 관련 파일과 함수: `controller/MinorLaborController.minorGuard`.
- 문제의 코드 경로: master store ownership만 검사하고 target employee의 해당 매장 소속을 확인하지 않았다.
- 필요한 공격 조건: 다른 매장을 소유한 MASTER와 대상 employeeId.
- 예상 영향: 연령·보호자·야간근로 관련 민감 정보 추론.
- 검증 결과: 사전 회귀 테스트가 기존 구현에서 실패했다.
- 수정 내용: 서비스 호출 전 `assertEmployeeInStore`를 추가했다.
- 추가한 테스트: `MinorLaborControllerTest`.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

## 수정한 파일

- 인가/인증: `UserController`, `PersonalUserController`, `LegacyAttendanceProxyController`, `EvidencePackageController`, `MinorLaborController`, `LoginController`, OAuth state store/service, STOMP interceptor, frontend Kakao auth 경로.
- 데이터/비밀: refresh/reset token entities·repositories·services, encrypted PII entities/converter, V68 migration, compose 및 `.env.example`.
- 로그/CORS: geocoding, mail/push/JWT/auth logging, `WebConfig`.
- 테스트: controller/service/config/frontend 회귀 테스트를 추가·갱신했다.

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `backend\gradlew.bat test` (시작 전) | 통과 |
| 선택 보안 테스트 묶음 | 통과 |
| `backend\gradlew.bat test` (수정 후 전체) | Gradle 출력은 `BUILD SUCCESSFUL`이나 실행 래퍼가 181.8초에 timeout(124)을 반환; 깨끗한 종료 코드로 확정하지 않음 |
| `backend\gradlew.bat build -x test` | 통과 |
| `frontend\npx jest __tests__/auth/kakaoLoginScreen.test.ts --runInBand` | 1 suite, 8 tests 통과 |
| `frontend\npm run test:unit` | 80 suites, 461 tests 통과; 기존 STOMP worker/timer 종료 경고 존재 |
| `frontend\npx tsc --noEmit` | 통과 |
| `frontend\npm run lint` | 오류 0, 기존 경고 1030개 |
| `docker compose config --quiet` | 필수 secret 누락 거부, 명시한 dummy validation 값은 통과 |
| `git diff --check` | 통과 |

## 미실행 검사와 이유

- 실제 Kakao/SMTP/Toss/S3/FCM 호출: 제3자 시스템 요청 금지 범위.
- 운영 DB migration/backfill: 운영 접근·실제 데이터 변경 금지 범위.
- CVE 온라인 조회 및 패키지 업데이트: 외부 요청·무관한 전체 의존성 업그레이드 금지 범위.
- Android emulator E2E: 인증 flow의 외부 Kakao callback이 필요하고 이번 범위를 벗어난다.
- MySQL에서 V68 실제 적용: 기존 로컬 Docker 볼륨을 변경하지 않기 위해 미실행.

## 남은 위험

- Critical: 0
- High: 0
- Medium: 1 — V68 적용 전 기존 PII 행은 평문이며, 본 변경은 안전을 위해 자동 대량 backfill을 하지 않는다.
- Low: 1 — 기존 refresh/reset raw column 값은 새 hash lookup으로 인증되지 않지만 만료·보존 전 DB/백업에 남는다.

## 배포 전 필수 조치

1. MySQL 백업 후 V68 적용을 스테이징에서 검증하고, 승인된 별도 배치로 기존 PII ciphertext backfill을 수행한다.
2. 기존 refresh token을 만료 또는 폐기하고, backup/log retention 정책으로 historic raw token·OTP·주소 로그를 정리한다.
3. `SODAM_JWT_SECRET`, PII key/pepper, DB password, SMTP host/from 및 실제 CORS origin을 secret manager/environment에 명시한다.
4. Kakao 등록 콘솔에서 redirect URI와 PKCE code challenge flow를 스테이징 앱으로 E2E 검증한다.
5. CI에서 backend 전체 테스트가 wrapper timeout 없이 0으로 종료되는지 재실행하고, frontend STOMP open-handle 경고를 별도 정리한다.

---

## 2026-07-30 보충 감사 및 수정 결과

위의 기존 로컬 감사 기록은 보존했다. 이 절은 그 뒤 현재 작업 트리에서 다시 확인한 코드 경로, 추가한 회귀 테스트, 그리고 이번에 적용한 최소 범위 수정만 기록한다. 운영 서버·실제 데이터·외부 연동에는 접근하거나 요청을 보내지 않았다.

### 보충 발견 사항 요약

| ID | 위험도 | 상태 | 요약 |
|---|---|---|---|
| SEC-AUD-014 | Medium | 수정·회귀 테스트 통과 | 매장 소유자 역할을 전역 안내 콘텐츠 운영 권한으로 오인 |
| SEC-AUD-015 | High | 수정·구성 검증 통과 | MySQL·Redis·세션 Redis·Adminer가 모든 인터페이스에 게시됨 |
| SEC-AUD-016 | Medium | 수정·회귀 테스트 통과 | 출퇴근 사전 위치/NFC 검증이 매장 소속을 확인하지 않음 |
| SEC-AUD-017 | Medium | 수정·회귀 테스트 통과 | 로그인 rate-limit 키를 쿼리 이메일로 무한 분할 가능 |
| SEC-AUD-018 | Low | 수정·단위 테스트 통과 | Toss 결제 식별자와 공급자 오류 본문이 로그로 유출될 수 있음 |
| SEC-AUD-019 | Medium | 미수정·배포 전 조치 필요 | React Native access/refresh token이 AsyncStorage에 평문 저장됨 |

### SEC-AUD-014 — Medium — 전역 콘텐츠 운영 권한 혼동

- **관련 파일과 함수:** `UserController.convertToOwner`, `LaborInfoController`, `PolicyInfoController`, `TaxInfoController`, `TipInfoController`, `QnaInfoController`의 쓰기 API, 새 `SystemContentAdminAuthorizer.canManage`.
- **문제 코드 경로:** 일반 사용자가 본인 계정을 매장 소유자(`MASTER`)로 전환한 뒤, `@MasterOnly`만 요구하던 전역 노무·세무·정책·팁·Q&A 콘텐츠의 생성·수정·삭제 API를 호출할 수 있었다. 매장 소유권은 시스템 운영 권한의 근거가 아니다.
- **필요한 공격 조건:** 유효한 일반 사용자 계정과 자기 계정의 소유자 전환 API 호출 권한.
- **예상 영향:** 모든 사용자에게 노출되는 전역 안내 콘텐츠의 무단 변조. 결제·개인정보 직접 접근 경로는 확인하지 못했으므로 Medium으로 분류했다.
- **검증 결과:** 수정 전 `SecurityRbacTest`에서 허용 목록 밖 `ROLE_MASTER`가 `POST /api/tip-info`에 실제로 200을 받아 재현됐다.
- **수정 내용:** `SystemContentAdminOnly`와 서버 설정 기반 allowlist를 추가했다. `SODAM_SECURITY_SYSTEM_CONTENT_ADMIN_USER_IDS`가 비어 있으면 실패 폐쇄하며, 클라이언트가 보낸 역할·ID가 아니라 인증된 `UserPrincipal`의 서버 측 ID만 검사한다.
- **추가한 테스트:** allowlist 밖 MASTER의 403과 allowlist 안 `UserPrincipal(1)`의 정상 생성 200을 `SecurityRbacTest`에 추가했다. 기존 정상 쓰기 테스트는 `LaborInfoIntegrationTest`에서 설정된 시스템 운영자 principal을 사용하도록 조정했다.
- **수정 후 검증 결과:** 관련 회귀 테스트가 통과했다. 정상 운영자 쓰기와 일반 매장 소유자 차단을 모두 확인했다.
- **남은 위험:** 배포 시 실제 시스템 콘텐츠 운영자 ID를 환경 변수로 지정해야 한다. 누락 시 의도대로 모든 전역 쓰기가 차단된다.

### SEC-AUD-015 — High — Docker Compose 관리용 데이터 서비스 공개

- **관련 파일과 함수:** 루트 `docker-compose.yml`의 `mysql`, `redis`, `session-redis`, `adminer` 포트 매핑.
- **문제 코드 경로:** 암호·ACL이 없는 Redis 및 세션 Redis와 DB 관리 도구가 호스트의 모든 네트워크 인터페이스로 게시될 수 있었다.
- **필요한 공격 조건:** Compose를 실행한 호스트의 해당 포트에 신뢰할 수 없는 네트워크 경로가 존재해야 한다.
- **예상 영향:** 직접 Redis 접근을 통한 캐시/세션 조작, 데이터베이스 공격면 확대, 관리 도구 접근. 네트워크 노출 하나로 재현 가능한 인프라 취약점이므로 High로 분류했다.
- **검증 결과:** 수정 전 Compose 설정에서 네 포트가 인터페이스 미지정 방식으로 게시되는 것을 확인했다.
- **수정 내용:** 네 포트를 모두 `127.0.0.1:`에만 바인딩했다. 백엔드와 웹의 의도된 서비스 포트는 변경하지 않았다.
- **추가한 테스트:** `docker compose config --no-interpolate`로 생성된 포트 매핑을 확인했다.
- **수정 후 검증 결과:** MySQL `13306`, Redis `16379`, 세션 Redis `16380`, Adminer `18080`이 모두 `127.0.0.1` 바인딩으로 출력됐다.
- **남은 위험:** 외부 DB/Redis 접속이 사업상 필요하면 public 포트 매핑을 되돌리지 말고, 사설망·방화벽·Redis AUTH/TLS/ACL을 별도 구성해야 한다. 실제 Docker 기동은 기존 로컬 볼륨을 보존하기 위해 하지 않았다.

### SEC-AUD-016 — Medium — 출퇴근 사전 검증의 매장 소속 누락

- **관련 파일과 함수:** `AttendanceController.verifyLocation`, `AttendanceController.verifyNfc`.
- **문제 코드 경로:** 인증된 사용자가 body의 `storeId`를 바꿔 타 매장의 위치 반경 거리나 활성 NFC 태그 유효성 정보를 조회할 수 있었다. 실제 check-in/check-out 경로의 본인 검증과는 별개의 사전 검증 API였다.
- **필요한 공격 조건:** 유효한 직원 또는 매장 소유자 JWT와 추측 가능한 다른 매장 ID.
- **예상 영향:** 타 매장 위치·NFC 구성의 제한된 정보 노출. 실제 출퇴근 위조까지는 도달하지 않아 Medium으로 분류했다.
- **검증 결과:** 수정 전 관계없는 MASTER principal의 두 사전 검증 요청이 200으로 응답해 회귀 테스트에서 재현됐다.
- **수정 내용:** 위치 검증은 항상 `assertMemberOfStore`를 수행하고, NFC 검증은 기존의 storeId 누락 시 일반 실패 동작을 유지하면서 storeId가 있으면 같은 가드를 수행한다.
- **추가한 테스트:** `SecurityRbacTest`에 타 매장 `verify/location`, `verify/nfc` 각각의 403 기대값을 추가했다.
- **수정 후 검증 결과:** 타 매장 요청은 403이며, 소속 매장에 대한 기존 검증 경로는 유지된다.
- **남은 위험:** GPS 좌표의 진위와 NFC 복제 내성은 이 인가 수정의 범위 밖이며 실기기 E2E로 별도 확인해야 한다.

### SEC-AUD-017 — Medium — 로그인 rate-limit 키 분할과 메모리 증가

- **관련 파일과 함수:** `RateLimitFilter.doFilterInternal`, `RateLimitFilter.resolveLoginBucket`.
- **문제 코드 경로:** `/api/login`의 버킷 키가 `clientIp + request.getParameter("email")`였다. JSON 로그인에서는 이메일이 null인 반면, 공격자는 쿼리의 email을 매번 바꿔 IP별 5회 제한을 우회하고 버킷 map을 계속 늘릴 수 있었다.
- **필요한 공격 조건:** 한 IP에서 로그인 엔드포인트로 반복 요청을 보낼 수 있어야 한다.
- **예상 영향:** 계정 대입 시도의 IP 제한 약화와 애플리케이션 메모리 증가. 로그인 자체의 계정별 제어는 별도 서비스가 담당하므로 Medium으로 분류했다.
- **검증 결과:** 수정 전 서로 다른 query email 다섯 개 뒤 여섯 번째 요청도 204가 되어 재현됐다.
- **수정 내용:** 필터 버킷 키를 신뢰 경계인 `clientIp`로만 고정했다. JSON 본문·query·form의 클라이언트 입력은 키에 포함하지 않는다.
- **추가한 테스트:** `RateLimitFilterTest`가 같은 IP와 변형된 query email 여섯 번째 요청에서 429를 요구한다.
- **수정 후 검증 결과:** 해당 테스트가 통과했고, 변형된 email로도 우회되지 않는다.
- **남은 위험:** 현재 버킷은 단일 인스턴스 메모리다. 다중 인스턴스 운영의 분산 rate-limit 및 버킷 만료 정책은 Redis 기반 구현으로 보완해야 한다.

### SEC-AUD-018 — Low — 결제 식별자 및 공급자 오류 본문 로깅

- **관련 파일과 함수:** `LiveTossPaymentGateway.confirm/cancel`, `LiveTossBillingClient.issueBillingKey/charge/cancel`, `TossWebhookService.processWebhookPayload`, 새 `PaymentLogRedactor.redact`.
- **문제 코드 경로:** Toss paymentKey·orderId·customerKey와 HTTP 오류 응답 본문이 INFO/WARN 로그 인자로 전달될 수 있었다.
- **필요한 공격 조건:** 결제 동작 또는 웹훅이 발생하고 애플리케이션 로그를 읽을 권한이 있어야 한다.
- **예상 영향:** 결제 식별자·공급자 오류 정보가 로그 보존 시스템으로 확산. 로그 접근이 추가 조건이라 Low로 분류했다.
- **검증 결과:** 각 생산 코드 경로에서 원문 식별자/response body가 로그 인자로 사용되는 것을 소스에서 확인했다.
- **수정 내용:** 원문은 외부 요청과 DB 조회에만 유지하고, 로그 변수는 `[REDACTED]`로 교체했다. 공급자 오류 본문은 로그에 기록하지 않는다.
- **추가한 테스트:** `PaymentLogRedactorTest`가 null/빈 값/임의 식별자를 모두 redaction 처리하는지 확인한다.
- **수정 후 검증 결과:** redactor 단위 테스트와 관련 결제 코드를 포함한 컴파일이 통과했다. 결제 제공자 실제 호출은 범위상 하지 않았다.
- **남은 위험:** 기존 로그 집계본에 남은 식별자는 이번 코드 수정으로 제거되지 않는다. 운영 로그 보존 정책에서 별도 정리가 필요하다.

### SEC-AUD-019 — Medium — 모바일 토큰의 평문 저장 (미수정)

- **관련 파일과 함수:** `frontend/src/common/auth/tokenStore.ts`의 `setAccess/setRefresh/setTokens`, `frontend/src/common/utils/unifiedStorage.ts`의 AsyncStorage wrapper.
- **문제 코드 경로:** access token과 refresh token이 `@react-native-async-storage/async-storage`에 그대로 기록된다. 현재 `frontend/package.json`과 lockfile에서 Keychain/Keystore용 secure-storage 의존성은 확인되지 않았다.
- **필요한 공격 조건:** 루팅·탈옥·악성 디버깅·취약한 백업 등으로 해당 기기의 앱 저장소를 읽을 수 있어야 한다.
- **예상 영향:** access/refresh bearer credential 탈취 및 세션 재사용.
- **검증 결과:** 두 토큰 키가 AsyncStorage-backed `unifiedStorage.setItem`에 전달되는 소스 경로를 확인했다.
- **수정 내용:** 없음. 네이티브 Keychain/Keystore 의존성 추가와 iOS/Android 마이그레이션·로그아웃·복구 흐름 검증이 필요한 변경이어서, 이 감사에서 안전성 검증 없이 넓은 범위로 교체하지 않았다.
- **추가한 테스트:** 없음.
- **수정 후 검증 결과:** 해당 없음.
- **남은 위험:** 배포 전 secure storage로 이전하고, 기존 평문 토큰을 폐기/재발급하는 마이그레이션과 실기기 회귀 테스트가 필요하다.

### 이번 보충에서 수정한 파일

- 인가: `SystemContentAdminAuthorizer`, `SystemContentAdminOnly`, `LaborInfoController`, `PolicyInfoController`, `TaxInfoController`, `TipInfoController`, `QnaInfoController`, `AttendanceController`, `application.yml`.
- 인프라·rate limit: `docker-compose.yml`, `RateLimitFilter`.
- 로그: `PaymentLogRedactor`, `LiveTossPaymentGateway`, `LiveTossBillingClient`, `TossWebhookService`.
- 테스트: `SecurityRbacTest`, `LaborInfoIntegrationTest`, `RateLimitFilterTest`, `PaymentLogRedactorTest`.

### 이번 보충에서 실행한 명령과 결과

| 명령 또는 검사 | 결과 |
|---|---|
| 수정 전 RBAC 회귀 테스트 | SEC-AUD-014는 200 대 403 기대값 불일치, SEC-AUD-016은 타 매장 사전 검증 200으로 재현 |
| 수정 전 `RateLimitFilterTest` | query email 변형 여섯 번째 요청이 204로 재현 |
| `gradlew.bat test --tests SecurityRbacTest --tests LaborInfoIntegrationTest --tests RateLimitFilterTest --tests PaymentLogRedactorTest --offline --no-daemon` | 빌드 성공. 26 tests, failures 0, errors 0 |
| `gradlew.bat build -x test --offline --no-daemon` | 빌드 성공 |
| `docker compose config --no-interpolate` | DB·두 Redis·Adminer 포트가 모두 `127.0.0.1` 바인딩임을 확인 |
| `frontend\node_modules\.bin\tsc.cmd --noEmit` | 통과 |
| `frontend\npm run lint` | 종료 코드 0 |
| `web-master\npm run lint`, `web-master\node_modules\.bin\tsc.cmd --noEmit` | 모두 통과 |
| 정적 sink 검토 (`rg`) | 사용자 입력이 명령 실행 또는 동적 SQL로 이어지는 확인된 경로 없음; 외부 HTTP는 설정 기반 연동으로 한정 |
| `backend\gradlew.bat test --offline --no-daemon` 전체 재실행 | 12분 이상 결과 보고서 갱신 없이 고부하로 지속되어, 이 감사가 시작한 test process만 종료. 전체 통과로 판정하지 않음 |

### 미실행 또는 완료하지 못한 보충 검사

- React Native 전체 `npm run test:unit`: STOMP 재접속 타이머가 테스트 종료 뒤에도 남아 결과 요약 없이 반복 경고를 내고 대기했다. 시작한 프로세스만 종료했으며 통과·실패를 확정하지 않았다.
- `web-master` production build: `next/font/google`가 Google 글꼴을 가져오는 구성이라 외부 요청 금지 범위를 지키기 위해 미실행했다.
- 의존성 CVE DB 조회, 실서비스·외부 OAuth/결제/메일/FCM/S3 호출, Docker 실제 기동, 운영 DB와 실제 데이터, Android/iOS 실기기 E2E는 모두 범위 밖이다.

### 보충 후 남은 위험과 최종 판정

- **Critical: 0**
- **High: 0**
- **Medium: 2** — 기존 보고서의 PII migration/backfill 잔여 위험 1건과 SEC-AUD-019 모바일 평문 토큰 저장 1건.
- **Low: 1** — 기존 raw bearer credential이 보존된 DB/백업에 남을 수 있는 잔여 위험.

**최종 판정: CONDITIONAL PASS.** 코드 수준에서 확인된 High와 이번 보충의 Medium/Low는 최소 범위로 수정하고 회귀 테스트를 통과시켰다. 다만 모바일 토큰 저장, PII backfill, 전체 백엔드 테스트 및 모바일 전체 단위 테스트의 완료 결과가 남아 있으므로 이를 해결하기 전에는 “80% 이상 신뢰” 같은 수치 판정을 하지 않는다.
