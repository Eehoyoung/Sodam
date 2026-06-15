# 소담 통합 테스트 플로우 (PRD 구체화)

작성: 2026-05-28 · 기준: PRD §4.1 MVP + FEATURES.md · 대상: 라이브 BE `http://localhost:7070`

> PRD의 MVP 기능(F-AUTH-01 ~ F-PAY-03)을 **순차 happy-path E2E 플로우**로 구체화한다.
> 각 단계는 실제 API 호출 + 입력 + 기대 결과로 정의하며, JWT 는 단계 간 연결된다.
> 실행: `bash scripts/e2e-prd-flow.sh` (결과는 HTTP 코드 + 응답 핵심으로 판정).

## 사장님(Master) 핵심 플로우 — "은영 사장님" 페르소나

| # | PRD ID | 단계 | API | 입력(핵심) | 기대 |
|---|---|---|---|---|---|
| 1 | F-AUTH-01 | 회원가입(사장) | `POST /api/join` | name·email(고유)·password(8+)·userGrade=Master·약관3종 동의 | 2xx, 가입 성공 |
| 2 | F-AUTH-01 | 로그인 | `POST /api/login` | email·password | 200 + `accessToken`/`refreshToken` |
| 3 | F-USER-01 | 내 정보 | `GET /api/me` (또는 `/api/auth/me`) | JWT | 200 + user(userGrade) |
| 4 | F-STORE-01 | 매장 등록 | `POST /api/stores/registration` | storeName·사업자번호·주소·lat/lng·radius·기본시급 | 2xx + storeId |
| 5 | F-STORE-02 | 매장 조회/반경 | `GET /api/stores/{id}` | JWT | 200 + radius·lat/lng |
| 6 | F-WAGE-01 | 기본 시급 확인 | `GET /api/stores/{id}` | — | storeStandardHourWage 반영 |
| 7 | F-PAY-01 | 급여 계산 | `POST /api/payroll/calculate` | storeId·startDate·endDate | 2xx (직원 0명 시 빈 배열도 정상) |
| 8 | F-INFO-01 | 인포허브 | `GET /api/labor-info` | — | 200 + 목록(배열) |
| 9 | F-QNA-01 | Q&A | `GET /api/qna-info` | — | 200 |
| 10 | F-SUB-01 | 구독 플랜 | `GET /api/billing/plans` | — | 200 + 플랜 목록 |

## 직원(Employee) 핵심 플로우 — "지훈" 페르소나

| # | PRD ID | 단계 | API | 기대 |
|---|---|---|---|---|
| E1 | F-AUTH-01 | 직원 가입/로그인 | `POST /api/join`(Employee) → `POST /api/login` | 200 + JWT |
| E2 | F-EMP-01 | 매장 코드 가입 | `POST /api/stores/join-by-code` | 2xx 또는 404(코드불일치 시 명확한 메시지) |
| E3 | F-ATT-02 | GPS 출근 | `POST /api/attendance/check-in` {employeeId,storeId,lat,lng} | 비즈니스 응답(반경 검증) |
| E4 | F-ATT-03 | 출퇴근 조회 | `GET /api/attendance/current` | 200 |

## 판정 기준
- **PASS**: 2xx, 또는 입력 검증 실패를 의도한 단계에서 4xx + 명확한 errorCode(글로벌 예외 핸들러 동작).
- **인프라 OK**: 401/400/404 라도 "서버가 라우트를 처리하고 의미있는 JSON 을 반환" 하면 통신 계층은 정상.
- **FAIL**: 5xx, 연결 거부, 또는 happy-path 2xx 기대 단계에서 4xx.

## 발견·조치 이슈 (라이브 통합테스트 2026-05-28)
| 심각도 | 이슈 | 원인 | 조치 |
|---|---|---|---|
| **P0(수정완료)** | 로그인 전체 500 `Data truncation: datetime '1657912-...'` | docker-compose 가 ms 값(`JWT_REFRESH_EXPIRATION=604800000`)을 yaml `refresh-token-validity-in-days`(일) 에 바인딩 → 165만년 만료를 MySQL insert. H2 단위테스트는 관대해 미검출, MySQL 라이브가 검출 | yaml/compose/.env 를 단위 명확한 `JWT_TOKEN_VALIDITY_SECONDS`/`JWT_REFRESH_VALIDITY_DAYS` 로 분리. 액세스토큰 41일→1시간 정상화. 재테스트 GREEN |
| P2(백로그) | 매장 등록 시 `businessNumber`(사업자등록번호 NOT NULL·UNIQUE) 누락→500 | BE entity.businessNumber=사업자등록번호 이나 FE DTO businessNumber 라벨은 "매장 유선전화" + 별도 businessLicenseNumber 존재 → 매핑 의미 모호, 유선전화 미입력 시 빈값 위험 | 서비스 매핑 점검 후 FE 라벨/필드 정합 필요 |

## 비고
- 결제 정기결제(F-SUB) 실연동은 토스 키 필요 → mock 모드. 플랜 조회까지만 검증.
- NFC(F-ATT-01)는 디바이스 필요 → GPS 경로(F-ATT-02)로 통신 검증.
- DB: MySQL 컨테이너(sodam-mysql, host 13306), Hibernate ddl-auto=update 로 스키마 자동 생성.
