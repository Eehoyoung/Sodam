# 운영 테스트 결과 — 에뮬레이터 + Docker BE PRD E2E (2026-06-23)

> 목적: 빌드/실행 후 **실제 요청을 쏘고 응답·로그를 분석**해 PRD 핵심 기능이 끊김 없이 동작함을 증명.
> 환경: Docker 백엔드(이미지 빌드 성공) + MySQL/Redis + Android 에뮬레이터(Medium_Phone). 지오코딩 mock 모드.

## 1. 인프라 기동 결과
| 항목 | 결과 |
|---|---|
| Docker BE 이미지 빌드(멀티스테이지 gradle bootJar) | ✅ 성공 |
| 스택 기동(BE/MySQL/Redis/Adminer) | ✅ 전부 healthy (BE :7070) |
| Android 앱 빌드(installDebug) | ✅ BUILD SUCCESSFUL (14m37s), 설치 `com.sodam_front_end` |
| 앱 기동 | ✅ 프로세스 생존·MainActivity·Splash |
| 앱 JS 번들 로드 | ⚠️ 차단 — **WSL `wslrelay.exe`가 호스트 8081 점유**(Windows+WSL 네트워킹 충돌, 코드 무관) → Metro 도달 불가 |

## 2. BE PRD 기능체인 E2E (실요청→실응답) — **인수 시나리오 완주**
| # | 단계 | 엔드포인트 | 결과 |
|---|---|---|---|
| 1 | 사장 가입 | POST /api/join | ✅ 200 |
| 2 | 로그인+JWT | POST /api/login | ✅ 200 (토큰 290B) |
| 3 | 본인확인 | GET /api/me | ✅ 200 role=MASTER |
| 4 | 매장 등록 | POST /api/stores/registration | ✅ 200 (storeCode 발급) |
| 5 | **멀티매장 게이트** | 2번째 매장 등록 | ✅ **402** `{requiredPlan:PRO, currentPlan:FREE}` "매장은 1개까지 무료" |
| 6 | 직원 가입/로그인 | /api/join·/api/login | ✅ 200 |
| 7 | **직원 매장 합류** | POST /api/stores/join-by-code | ✅ 200 (★수정 후) |
| 8 | 위치정보 동의 | PUT /api/auth/consents/location?agreed=true | ✅ 200 |
| 9 | 출근 | POST /api/attendance/check-in | ✅ 200 (GPS+동의 검증) |
| 10 | 퇴근 | POST /api/attendance/check-out | ✅ 200 |
| 11 | **IDOR 차단** | check-in with 타인 employeeId | ✅ **403** "본인 정보만 접근할 수 있어요" |
| 12 | 시급 설정/조회 | POST·GET /api/wages/employee | ✅ 200 (=12000) |
| 13 | 급여 정책 | POST /api/payroll-policy/store/{id} | ✅ 200 |
| 14 | **급여 계산** | POST /api/payroll/calculate | ✅ 200 (payroll 생성) |
| 15 | **명세서 PDF** | GET /api/payroll/{id}/pdf | ✅ 200 `%PDF-1.5` 2330B application/pdf |

→ **가입→매장→직원→출퇴근→급여→명세서** 핵심 인수 시나리오가 라이브로 끊김 없이 완주. 이번 세션에 구현한 **멀티매장 게이트(T1)·출퇴근 IDOR 차단(P0-A)**도 라이브 검증됨.

## 3. 운영 테스트로 발견·수정한 결함
| 결함 | 심각도 | 처리 |
|---|---|---|
| **android/build.gradle**: `buildscript{}`가 `plugins{}` 뒤 → 안드로이드 빌드 전체 실패 (FCM 커밋 회귀) | 🔴 빌드차단 | ✅ 수정·커밋(b75141d), BUILD SUCCESSFUL 검증 |
| **StoreController @MasterOnly**가 직원 셀프 합류(join-by-code, E-301)까지 차단 → 직원이 매장 합류 불가 | 🔴 PRD차단 | ✅ 메서드 `@EmployeeOrMaster` 오버라이드 수정·커밋(70c1454), 라이브 200 검증 |
| **db/migration `*.sql` gitignore**로 Flyway 마이그레이션이 한 번도 커밋 안 됨(신규 클론 스키마 누락) | 🟠 배포차단 | ✅ gitignore 예외·커밋(9ceba42) |
| GET /api/attendance/employee/{id}/today → 500 | 🟡 경미 | 기록(후속) |
| Redis 캐시 워밍업: `Optional` 직렬화 오류(jackson-datatype-jdk8 미등록) | 🟡 비치명 | 기록(후속) |
| 매장 등록 시 PayrollPolicy 자동생성 안 됨(급여계산 전 별도 생성 필요) | 🟡 UX | 기록(후속 — 등록 시 기본정책 생성 검토) |

## 4. 외부 키/호스트 환경 (코드 무관)
- Kakao 지오코딩: 라이브 키가 실주소도 결과 미반환(키 무권한/만료) → 테스트는 mock 모드로 진행. **실 운영 키 교체 필요(인간/외부)**.
- 앱 JS 로드: WSL `wslrelay.exe`의 8081 점유 → Metro 차단. 회피: 호스트 8081 정리 또는 오프라인 번들/릴리스 빌드.

## 결론
**핵심 PRD 체인은 실 BE에서 끊김 없이 동작 증명 완료.** 운영 테스트가 빌드차단·PRD차단·배포차단 결함 3건을 추가로 잡아내 즉시 수정했다. 잔여는 외부 키(Kakao)·호스트 네트워킹(WSL 8081)·경미 후속 3건.

---

## 5. 더미데이터 1천건 + DB/API CRUD + 스트레스 (2026-06-24)

### 5.1 더미데이터
FK 정합 일괄삽입: 더미직원 20명 + 출퇴근 1,008건 → **attendance 1,009건**(MySQL 영속).

### 5.2 DB CRUD (직접 SQL) ✅
READ(집계 1009건/9072h) · UPDATE(시급 row=1) · DELETE(48건→0, 1009→961). 전부 영속 검증.

### 5.3 API CRUD + DB 교차검증 ✅
- READ 정합: API 961 = DB 961 (대량 정확 반환)
- CREATE: API 출근→DB+1 / 시급 API→DB=13500
- 매입 CRUD: 생성(자식 item 포함)→조회→삭제(cascade 자식까지) 전부 DB 일치
- 읽기 스윕(에이전트): GET 38개 200, 게이팅 402 5개, 진짜 500 = 0
- **쓰기 스윕(에이전트, 48개 엔드포인트)**: subscription/timeoff/correction/notice/shift/break/document/labor-contract/nfc/profile/notification 등 전부 정상 또는 의도된 비즈니스 예외

### 5.4 스트레스 테스트 ✅
| 대상 | 부하 | 결과 |
|---|---|---|
| 캐시 GET /api/me | 100req/동시25 | 200×100, **평균 10ms p95 11ms** |
| 대량 attendance/store(961행 JOIN FETCH) | 100req/동시25 | 200×100, **평균 88ms p95 324ms**, ERROR 0 |
| 버스트(50동시) | 500req | **429 다수** — 레이트리미터(Bucket4j 일반 120/분·IP) 작동, BE CPU idle·크래시/500 없음 = **회복탄력성 양호** |

> 튜닝 참고: 일반 한도 120/분·IP — 매장 공용 WiFi/NAT 다중 사용자 시 정상 사용자도 throttle 가능, 운영 전 검토 권장.

### 5.5 운영 테스트가 잡아 수정한 결함 (전부 커밋)
| 결함 | 심각도 | 커밋 |
|---|---|---|
| 출퇴근 목록/매장/today LazyInit → 500 | 🔴 | ca36ee7 |
| 필수 파라미터 누락 500(→400) | 🟠 | f289d27 |
| Redis 캐시 직렬화 실패(Optional·unknown field) | 🟠 | f289d27 |
| **POST /api/auth/refresh LazyInit → 500(토큰 갱신 전면 실패)** | 🔴 출시차단 | 89eb73a |

### 5.6 인간 검토 항목(수정 안 함)
- InsuranceFiling 응답에 평문 주민번호 echo — **의도된 설계**(제출용·미저장·로그 마스킹·마스터 전용)로 CLAUDE.md 위반 아님. 단 full RN을 JSON 응답 대신 생성 PDF로만 내릴지 product/법무 검토 권장.
- manual-register 응답 employeeName mojibake — 인코딩 경미 이슈(비500).
