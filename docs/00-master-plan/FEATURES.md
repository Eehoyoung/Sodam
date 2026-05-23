# 소담 — 확정 기능 명세 (Features Spec)

> PRD §4 의 표를 화면·API 단위까지 풀어 쓴 문서. 1인 사업가가 출시 전까지 **이 목록만 끝내면 된다**.

---

## 범례
- 🟢 BE/FE 모두 코드 존재 → 검증·연동만
- 🟡 부분 존재 → 보완 필요
- 🔴 미구현 → 신규 개발

---

## A. 인증 & 사용자

### A-1. 회원가입/로그인 🟢
- **화면**: `LoginScreen`, `SignupScreen`, `ProfileScreen`
- **API**: `POST /api/auth/login`, `POST /api/auth/kakao`, `POST /api/auth/refresh`, `GET /api/auth/me`
- **수용기준**:
  - 이메일/비밀번호 로그인 성공 시 Access(1h)+Refresh(7d) 토큰 발급
  - 카카오 OAuth 성공 시 동일 토큰 구조
  - 401 시 자동 토큰 갱신 (Axios Interceptor)

### A-2. 사용자 등급 전환 🟢
- **API**: `PUT /api/user/{userId}/convert-to-owner`, `POST /api/users/{userId}/purpose`
- **등급**: `Personal` → `EMPLOYEE` (직원 매장 가입 시) / `MASTER` (매장 등록 시)

---

## B. 매장 (Store)

### B-1. 매장 등록 🟢
- **화면**: `StoreRegistraionScreen`
- **API**: `POST /api/stores/registration`
- **필수 필드**: 매장명, 사업자번호, 매장 전화, 업종, 기본 시급
- **자동 생성**: storeCode = `ST{timestamp}_{UUID8}`

### B-2. 매장 위치/반경 설정 🟢
- **API**: `PUT /api/stores/{storeId}/location`
- **수용기준**:
  - 도로명/지번 주소 동시 저장
  - 반경 기본 100m (앱 설정으로 변경 가능)
  - 위도·경도 미설정 시 출퇴근 GPS 검증 비활성

### B-3. 운영시간 설정 🟢
- **도메인**: `OperatingHours` (요일별 open/close)
- **수용기준**: `isOpenNow()` 가 운영 외 시간 출근을 경고 (차단은 X)

### B-4. 매장 직원 관리 🟢
- **API**: `GET /api/stores/{storeId}/employees`, `EmployeeStoreRelation`
- **화면**: `StoreDetailScreen` 직원 탭

---

## C. 출퇴근 (Attendance) — **핵심 차별점**

### C-1. NFC 출근 🟢
- **화면**: `AttendanceScreen` (NFC 모드)
- **API**: `POST /api/attendance/check-in`, `POST /api/attendance/verify/nfc`
- **수용기준**:
  - NFC 태그 ID가 매장에 등록된 ID와 일치해야 통과
  - 미지원 단말은 GPS-only 모드로 자동 폴백

### C-2. GPS 반경 검증 🟢
- **API**: `POST /api/attendance/verify/location`
- **알고리즘**: Haversine (`GeoUtils.isPointInRadius`)
- **수용기준**:
  - 반경 밖이면 출근 거부 + 사용자에게 거리 표시
  - 위치 권한 거부 시 "사장에게 수동 등록 요청" 버튼 제공

### C-3. 출퇴근 기록 조회 🟢
- **API**: `GET /api/attendance/employee/{id}`
- **수용기준**: 직원은 본인 것만, 사장은 매장 단위 조회

### C-4. 수동 출퇴근 (관리자) 🟢
- **도메인**: `Attendance.manualCheckIn/Out`
- **수용기준**: 사장만 호출 가능, 사유 입력 필수

### C-5. 출퇴근 누락 푸시 🔴
- **트리거**: 운영시간 시작 + 30분 후 미체크인 / 운영시간 종료 + 1h 후 미체크아웃
- **구현**: Spring Scheduler + FCM

---

## D. 시급 & 급여 (Wage / Payroll)

### D-1. 매장 기본 시급 / 직원별 시급 🟢
- **API**: `PUT /api/wages/store/{storeId}/standard`, `POST /api/wages/employee`

### D-2. 급여 자동 계산 🟢
- **화면**: `SalaryListScreen`, `SalaryDetailScreen`
- **API**: `POST /api/payroll/calculate`
- **계산 항목** (`Payroll.java` 기준):
  - 기본 근무, 초과(1.5배), 야간(1.5배 22:00~06:00), 주휴수당
  - 세전 → 세금(3.3% 사업소득 기준) → 실수령액
- **수용기준**:
  - 주 15시간 미만 → 주휴수당 0
  - 야간/연장 중복 시 가중치 합산 (한국 노동법 준수)

### D-3. 급여 명세서 발급 🟢
- **API**: `GET /api/payroll/{payrollId}`
- **상태**: DRAFT → APPROVED → PAID / CANCELLED

### D-4. 급여대장 PDF/엑셀 출력 🔴 (Phase 2)
- **수용기준**: 4대보험 EDI 신고 양식과 호환

---

## E. 휴가 / 연차 (TimeOff) 🟡 (Phase 2)

- **도메인 존재**: `TimeOff.java`
- **추가 필요**: 신청/승인 워크플로우, 잔여 연차 자동 계산 (입사일 기준)

---

## F. 정보 허브 (Info Hub) 🟢

| 카테고리 | 화면 | API/도메인 |
|---|---|---|
| 노무 정보 | `LaborInfoDetailScreen` | `LaborInfo` |
| 세무 정보 | `TaxInfoDetailScreen` | `TaxInfo` |
| 정책 정보 | `PolicyDetailScreen` | `PolicyInfo` |
| 사장님 팁 | `TipsDetailScreen` | `TipInfo` |
| Q&A | `qna/*` | `QnaInfo` |

- **수용기준**: 콘텐츠는 어드민이 백오피스에서 등록 (Phase 1 단순 CRUD)

---

## G. 구독 & 결제 🟡 (출시 차단 항목)

### G-1. 플랜 선택 UI 🟢
- **화면**: `SubscribeScreen` (4개 플랜 카드)

### G-2. 정기결제 연동 🔴 — **출시 전 반드시**
- **PG**: 토스페이먼츠 빌링키 발급 → 정기결제 등록
- **API (신규)**:
  - `POST /api/billing/issue-key` — 카드 등록
  - `POST /api/billing/subscribe` — 플랜 가입
  - `POST /api/billing/webhook` — 결제 성공/실패 수신
  - `DELETE /api/billing/cancel` — 해지
- **데이터**: `Subscription` 엔티티 신규 (planId, status, nextBillingAt, billingKey)

### G-3. 환급형 (Phase 2) 🔴
- 종소세 환급 신청 흐름:
  1. 사장님이 매출/지출 자료 업로드
  2. 세무사 파트너에게 케이스 전달 (이메일/Slack Webhook)
  3. 환급 확정 시 수수료 자동 정산 (10~20%)

---

## H. 알림 (Notification) 🔴

- FCM 토큰 등록: `POST /api/notifications/token`
- 알림 종류:
  1. 직원 출근/퇴근 푸시 (사장)
  2. 출퇴근 누락 (사장 + 직원)
  3. 급여 지급 완료 (직원)
  4. 구독 결제 성공/실패 (사장)
  5. 환급 진행 상태 (사장, Phase 2)

---

## I. 멀티 매장 (Master) 🟡 (Phase 2)

- **도메인 존재**: `MasterProfile`, `MasterStoreRelation`
- **추가 필요**: 매장별 매출/근태 대시보드 (`StoreQueryController` 통계 활용)

---

## J. 운영 · 인프라 🔴

| 항목 | 도구 | 우선순위 |
|---|---|---|
| 에러 추적 | Sentry (FE+BE) | P0 |
| 분석 | 자체 이벤트 테이블 → Redash (or Amplitude 무료) | P1 |
| CS | 채널톡 위젯 | P0 |
| CI/CD | GitHub Actions → AWS ECS | P0 |
| 보안 점검 | 분기 1회 OWASP ZAP 스캔 | P1 |

---

## 출시 차단 (Blocker) 체크리스트

출시 전 무조건 끝나야 하는 항목:

- [x] G-2 정기결제 연동 (토스페이먼츠) — BE Mock/Live 클라이언트 완성, FE SDK 통합만 남음 (CONFIRM_REQUIRED.md C-1)
- [x] H. FCM 푸시 (최소 출퇴근/결제) — BE 완료, FE firebase-messaging SDK 통합만 남음 (C-2)
- [x] J. Sentry 연동 — BE SentryConfig 완료 (C-3)
- [ ] J. 채널톡 CS 위젯 (C-4)
- [x] 개인정보처리방침 / 이용약관 / 마케팅 수신 동의 — 초안 완료, 변호사 검토 대기 (C-8)
- [ ] Play Store 등록 (C-5)
- [x] `.env` 평문 시크릿 제거 → `.env.example` 분리, AWS Secrets Manager (C-6)
- [x] BE 보안 점검 (`security_report.md` 의 SSRF 이슈는 GeocodingService 의 정규식+고정 엔드포인트로 이미 완화됨)
