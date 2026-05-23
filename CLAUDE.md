# CLAUDE.md — 소담 프로젝트 운영 지침

이 파일은 Claude Code가 소담(SODAM) 프로젝트에서 **자율적으로 작업할 때 따르는 헌법**이다.
모든 작업의 근거는 다음 4개 문서에 있다.

## 📜 마스터 문서 (이 순서대로 참고)

1. [docs/00-master-plan/마스터프로젝트개발계획.md](./docs/00-master-plan/마스터프로젝트개발계획.md) — CEO/CTO/CFO 통합 의사결정 (최우선)
2. [docs/00-master-plan/PRD.md](./docs/00-master-plan/PRD.md) — 제품 요구사항
3. [docs/00-master-plan/PROJECT_IDENTITY.md](./docs/00-master-plan/PROJECT_IDENTITY.md) — 정체성·방향성·금지사항
4. [docs/00-master-plan/FEATURES.md](./docs/00-master-plan/FEATURES.md) — 화면·API 단위 명세

> 모든 문서 카탈로그: [docs/README.md](./docs/README.md)

> 충돌 시 → **마스터 > PRD > IDENTITY > FEATURES** 순으로 우선.

---

## 🎯 한 줄 미션
> **출시를 막는 항목을 가장 먼저 없앤다. 기능 추가는 그 다음.**

---

## 📁 프로젝트 구조

```
Project_sodam/
├── backend/                      # Backend: Spring Boot 3.4.5, Java 17, MySQL, Redis
│   ├── src/main/java/com/rich/sodam/
│   │   ├── controller/         # REST 컨트롤러
│   │   ├── domain/             # JPA 엔티티
│   │   ├── service/            # 비즈니스 로직
│   │   ├── repository/         # JPA 리포지토리
│   │   ├── dto/                # 요청/응답 DTO
│   │   ├── jwt/, security/     # 인증
│   │   └── aop/                # 로깅, 성능 측정
│   ├── ApiList.yaml            # OpenAPI 3.0 명세 (100+ 엔드포인트)
│   └── build.gradle
│
├── frontend/       # Frontend: React Native 0.81, TypeScript
│   ├── src/
│   │   ├── features/           # 도메인별 (attendance/salary/store/...)
│   │   │   └── <도메인>/
│   │   │       ├── screens/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── services/
│   │   │       └── types.ts
│   │   ├── navigation/
│   │   ├── contexts/
│   │   └── common/
│   ├── App.tsx
│   └── package.json
│
├── README.md                   # 프로젝트 진입점
├── CLAUDE.md                   # ← 이 파일 (Claude 자동 로드)
├── docker-compose.yml
├── .env.example
└── docs/                       # 모든 문서 (docs/README.md 카탈로그)
    ├── 00-master-plan/         # 마스터·PRD·정체성·기능
    ├── 01-prd/                 # 역할별 PRD
    ├── 02-runbook/             # 실행·운영
    ├── 03-backlog/             # 추가작업·CONFIRM
    ├── 04-claude/              # AGENTS.md
    └── 05-design/              # 와이어·브랜드 카피
```

---

## 🛠 명령어 (Commands)

### Backend
```bash
cd backend
./gradlew bootRun                 # 로컬 실행
./gradlew test                    # 테스트
./gradlew build                   # 빌드
```

### Frontend
```bash
cd frontend
npm install
npm run start                     # Metro
npm run android                   # Android 빌드/실행
npm run test:unit                 # 단위 테스트
npm run lint
npm run build:android:release     # APK
npm run build:android:bundle      # AAB (Play Store 업로드용)
```

### API 명세 확인
- `backend/ApiList.yaml` (OpenAPI 3.0, 100+ 엔드포인트)
- `http://localhost:8080/swagger-ui/index.html` (BE 실행 시)

---

## ✅ 자율 작업 가능 (Yes, just do it)

마스터 문서 §5.1 기반:

- React Native/Spring Boot 기능 구현 + 단위 테스트
- 코드 리팩토링, 린트 정리
- 문서 작성/갱신 (PRD, FEATURES, API 가이드)
- ApiList.yaml 업데이트
- 버그 재현 → 수정 → 테스트
- 로컬 빌드/테스트 실행
- Sentry/CloudWatch 알람 로그 분석
- ESLint/TypeScript 에러 해소
- Git: 로컬 commit (push는 사용자가 직접)

---

## ⚠️ 인간 승인 필수 (Stop & Ask)

마스터 문서 §5.2 기반:

- 💳 **결제/과금 로직 변경** (PG 연동, 금액 계산, 환불)
- 🗄 **DB 마이그레이션 실행** (Flyway 스크립트는 작성 OK, 실행은 승인)
- 🚀 **운영 환경 배포** (AWS, Play Store 업로드)
- 🔑 **외부 API 키 발급/계약** (토스, FCM, 채널톡)
- ⚖️ **개인정보/약관 문구 변경** (법적 리스크)
- 📢 **광고/마케팅 문구 작성·게시** (CEO 톤 검토)
- 💬 **고객 응대 메시지 송신** (실제 채널)
- 🔨 **Git: push to main, force push, branch delete, history rewrite**
- 💰 **실제 결제·청구 트리거**
- 🌐 **외부 호출 (Slack/이메일/Webhook 발신)**

---

## 🚫 절대 금지 (Hard No)

1. ❌ 시크릿/API 키 코드에 하드코딩 — 무조건 `.env` + AWS Secrets Manager
2. ❌ 주민번호·계좌번호·카드번호 직접 저장 — 토스 빌링키만
3. ❌ `.env` / `application-prod.yml` 커밋
4. ❌ 마이크로서비스 분리 시도
5. ❌ 다국어 추가 (Phase 3 이전)
6. ❌ POS/재고/채용 기능 추가 (Non-Goal)
7. ❌ "AI 기반", "스마트", "혁신" 같은 마케팅 문구
8. ❌ `--no-verify`, `--force` 옵션 사용 (사용자 명시 지시 없는 한)
9. ❌ 무허가 데이터 삭제·DB drop·branch delete

---

## 🧭 작업 우선순위 (Claude가 다음 작업 선택 시)

1. **출시 차단 항목** (`docs/00-master-plan/FEATURES.md` 출시 차단 체크리스트)
2. **P0 보안 이슈** (`backend/docs/legacy-reports/security_report.md` 참고)
3. **Crash·결제 실패 등 사용자 영향 큰 버그**
4. **PRD §4.1 MVP 미완성 기능**
5. **테스트 커버리지 < 70% 인 핵심 도메인**
6. **리팩토링/문서화**

작업 선택 시: `docs/00-master-plan/FEATURES.md` 출시 차단 체크리스트가 비어있지 않으면 **항상 그것부터**.

---

## 💬 응답·코드 작성 가이드

### 톤
- 한국어 우선 (사용자가 한국어로 대화하므로)
- 사장님 페르소나 메시지는 친근한 존댓말 ("사장님, 출근이 등록되었어요")
- 개발자 대상 문서는 간결한 한국어 + 영문 기술 용어

### 코드
- 주석은 **왜(why)** 만, **무엇(what)** 은 코드로 표현
- 함수명·변수명은 의도가 드러나는 영어 (단, 한국 노동법 용어는 한글 가능: `weeklyAllowance`)
- 자바: Lombok 적극 활용 (현 코드 컨벤션)
- 코틀린/타입스크립트: `null` 안전성 명시
- TypeScript any 금지 (기존 코드도 점진 제거)

### 커밋 메시지
- 컨벤셔널 커밋: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- 마스터 문서 변경: `[MASTER]` 접두어
- 출시 차단 해소: `[BLOCKER]` 접두어

---

## 🧪 테스트 정책

| 영역 | 최소 커버리지 |
|---|---|
| Payroll(급여 계산) | 80% |
| Attendance(출퇴근 검증) | 80% |
| Wage(시급) | 70% |
| Auth(JWT) | 70% |
| 기타 도메인 | 50% |
| FE 핵심 훅 | 60% |

**테스트 작성 룰**:
- 한국 노동법 변경에 대비해 상수는 별도 파일에 분리
- 실제 시각 의존 테스트는 `Clock` 주입으로 시간 고정
- 통합 테스트는 H2 in-memory (Docker MySQL 불필요)

---

## 🔐 시크릿 관리

- 로컬: `backend/.env` (gitignored, 절대 커밋 금지)
- 개발/운영: AWS Secrets Manager (M1에 이관)
- BE 환경변수 패턴: `SODAM_<MODULE>_<KEY>` (예: `SODAM_JWT_SECRET`)
- 로그에 시크릿 출력 금지 (Sentry breadcrumb 포함)

---

## 📞 사용자(1인 사업가)에게 항상 알릴 것

다음 상황은 **자율 처리하지 말고 무조건 보고**:

1. 출시 일정에 영향 가는 블로커 발견 시
2. 보안 취약점 발견 시
3. 외부 비용 발생 가능 작업 (광고비, AWS 비용 급증, PG 수수료)
4. PII 노출 가능성 발견 시
5. PRD/마스터 문서와 충돌하는 기존 코드 발견 시

---

## 🤖 서브에이전트 사용

`docs/04-claude/AGENTS.md` 에 정의된 도메인 전문 에이전트들을 적극 활용:

- `payroll-validator`: 급여 계산 로직 정합성 검토
- `attendance-fraud-checker`: NFC/GPS 우회 가능성 점검
- `security-auditor`: PII 처리 및 OWASP 점검
- `billing-integrator`: 토스페이먼츠 연동 보조

병렬 가능한 검토 작업은 동시 실행으로 시간 절약.

---

## 📊 진행 상황 보고 양식

작업 단락 종료 시 다음 양식으로 1~2줄 요약:
- ✅ 완료한 것
- ⚠️ 인간 승인 대기 항목
- ▶️ 다음 작업 후보 1개

---

## 🆘 막혔을 때

1. 마스터 문서 §6 의사결정 프레임워크 참고
2. 그래도 모호하면 → 사용자에게 `AskUserQuestion` 으로 단일 결정만 묻기
3. 추측 금지 — 추측은 매출·법적 손해로 직결
