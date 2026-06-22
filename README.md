# 소담(SODAM) — 소상공인 근태·급여·세무 SaaS

> **소상공인이 만든, 소상공인을 담는 단 하나의 운영 비서**
>
> 직원 1~5명짜리 가게의 출퇴근·급여·세무를 자동으로 굴려주는 모바일 SaaS.

---

## 📄 제안 문서

- [소담(SODAM) 프랜차이즈 본사 제안서 HTML](./investment-request.html)
- [소담(SODAM) 초기 예산안 HTML](./budget-plan.html)

---

## 🚀 30초 시작

```powershell
# 1) Docker 풀스택 (권장)
cp .env.example .env       # 비밀번호 회전
docker compose up -d --build
curl http://localhost:7070/actuator/health

# 2) 또는 Gradle 로컬 (H2 in-memory)
cd backend
.\gradlew bootRun --args='--spring.profiles.active=dev'
```

테스트 계정 (DevSeed 자동 생성):
- 사장님: `owner@sodam.dev` / `sodam1234`
- 직원:   `staff@sodam.dev` / `sodam1234`

확인:
- Swagger UI: http://localhost:7070/swagger-ui/index.html
- DB GUI (Adminer): http://localhost:18080

---

## 📁 폴더 구조

```
Project_sodam/
├── README.md                    ← 이 문서 (진입점)
├── CLAUDE.md                    ← Claude Code 자율 작업 헌법 (자동 로드)
├── investment-request.html      ← 프랜차이즈 본사 제안서 HTML
├── budget-plan.html             ← 초기 예산안 HTML
├── docker-compose.yml           ← Docker 풀스택
├── .env.example                 ← 환경변수 템플릿
├── .claude/                     ← Claude 설정·커스텀 명령
│
├── backend/                       ← Backend (Spring Boot 3.4.5 / Java 17)
│   ├── src/main/java/com/rich/sodam/
│   │   ├── controller/          ← REST 컨트롤러 22개
│   │   ├── domain/              ← JPA 엔티티 24개
│   │   ├── service/             ← 비즈니스 서비스
│   │   ├── repository/          ← JPA 리포지토리
│   │   ├── dto/, jwt/, security/, aop/
│   │   ├── config/integration/  ← 외부 통합 (Toss/FCM/Sentry mock+live)
│   │   └── personal/            ← 개인 사용자 모듈
│   ├── src/test/                ← 도메인 단위 + MockMvc 통합 테스트
│   ├── ApiList.yaml             ← OpenAPI 3.0 (100+ 엔드포인트)
│   ├── Dockerfile               ← BE 멀티스테이지 이미지
│   ├── build.gradle
│   ├── logs/                    ← 빌드/실행 로그 (gitignored)
│   └── docs/legacy-reports/     ← 과거 인수인계 문서
│
├── frontend/        ← Frontend (React Native 0.81 / TypeScript)
│   ├── App.tsx
│   ├── src/
│   │   ├── theme/tokens.ts      ← 단일 디자인 토큰 (브랜드 #FF6B35)
│   │   ├── features/<도메인>/   ← attendance/salary/store/...
│   │   ├── navigation/
│   │   ├── contexts/
│   │   ├── common/{components,config,services,utils}
│   │   └── hooks/
│   ├── android/, ios/
│   └── docs/screenshots/
│
└── docs/                        ← 모든 문서
    ├── README.md                ← 문서 카탈로그
    ├── 00-master-plan/          ← 마스터 계획·정체성·PRD·기능 명세
    ├── 01-prd/                  ← 역할별 PRD (사장/직원/운영자/비회원)
    ├── 02-runbook/              ← 실행·운영 (Docker, Emulator, Progress)
    ├── 03-backlog/              ← 백로그·사용자 컨펌 항목
    ├── 04-claude/               ← 에이전트 정의·운영 가이드
    ├── 05-design/               ← 와이어프레임·브랜드 카피·디자인 감사
    └── legal/                   ← 약관·개인정보·마케팅 동의
```

---

## 📖 어디서부터 읽을까

| 상황 | 문서 |
|---|---|
| **처음 보는 사람** | `README.md` (이 문서) → `docs/02-runbook/서비스사용방법.md` |
| **프랜차이즈 본사 제출/제휴 제안** | `investment-request.html` |
| **초기 예산 검토** | `budget-plan.html` |
| **개발 환경 부팅** | `docs/02-runbook/RUN_EMULATOR.md` 또는 `docs/02-runbook/DOCKER.md` |
| **현재 진행 상황** | `docs/02-runbook/PROGRESS.md` |
| **제품 큰 그림** | `docs/00-master-plan/마스터프로젝트개발계획.md` |
| **요구사항/기능** | `docs/00-master-plan/PRD.md` + `docs/01-prd/PRD_*.md` |
| **남은 작업** | `docs/03-backlog/추가작업.md` |
| **사용자가 직접 해야 할 일** | `docs/03-backlog/CONFIRM_REQUIRED.md` |
| **Claude/에이전트 운영** | `CLAUDE.md` + `docs/04-claude/AGENTS.md` |
| **디자인 시스템** | `frontend/src/theme/tokens.ts` + `docs/05-design/` |

문서 카탈로그 전체: **`docs/README.md`**

---

## 🛠 주요 명령어

### Backend
```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=dev'   # dev (H2 + mock 외부서비스)
./gradlew build -x test                                   # 빌드
./gradlew test --tests "com.rich.sodam.domain.*"          # 도메인 테스트
```

### Frontend
```bash
cd frontend
npm install
npm run start        # Metro
npm run android      # Android 빌드/실행
npm run build:android:release   # APK
```

### Docker
```bash
docker compose up -d --build         # BE + MySQL + Redis + Adminer 풀스택
docker compose logs -f sodam-be
docker compose down                  # 정지 (볼륨 유지)
```

---

## 🎯 출시 상태 (2026-05-23)

- Phase 1 (MVP) 코드: **100%**
- P1 (출시 후 30일 보강): **~85%**
- E2E 통합 검증: **25/25 통과**
- 외부 통합: Mock 모드 동작 / Live 키 발급 대기 (`docs/03-backlog/CONFIRM_REQUIRED.md`)
- 출시 목표: **2026-08-31** (Android Play Store)

---

## 📜 라이선스 / 운영

1인 사업가 자체 운영. 외부 기여 없음.
문의: privacy@sodam.app (출시 후 활성)
