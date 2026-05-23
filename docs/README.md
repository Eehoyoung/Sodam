# 소담 문서 카탈로그

> 모든 프로젝트 문서를 카테고리별로 정리. 루트의 `../README.md` 가 진입점.

## 📂 카테고리 구조

### 00-master-plan/ — 최상위 의사결정
프로젝트의 정체성·전략·전체 요구사항. **충돌 시 가장 높은 우선순위.**

| 파일 | 한 줄 설명 |
|---|---|
| [마스터프로젝트개발계획.md](00-master-plan/마스터프로젝트개발계획.md) | CEO/CTO/CFO 3관점 통합 자율 실행 헌법 |
| [PROJECT_IDENTITY.md](00-master-plan/PROJECT_IDENTITY.md) | 정체성·방향성·금지사항 |
| [PRD.md](00-master-plan/PRD.md) | 제품 요구사항 마스터 (페르소나·기능·수익·로드맵) |
| [FEATURES.md](00-master-plan/FEATURES.md) | 화면·API 단위 명세 + 출시 차단 체크리스트 |

### 01-prd/ — 역할별 PRD 디테일
각 페르소나의 화면·액션·엣지케이스를 빠짐없이 enumerate.

| 파일 | 페르소나 | 화면 수 | 액션 수 |
|---|---|---|---|
| [PRD_OWNER.md](01-prd/PRD_OWNER.md) | 사장님(MASTER) | 11 | 82 |
| [PRD_EMPLOYEE.md](01-prd/PRD_EMPLOYEE.md) | 직원(EMPLOYEE) | 11 | 61 |
| [PRD_ADMIN.md](01-prd/PRD_ADMIN.md) | 운영자(1인 본인) | 9 | — |
| [PRD_GUEST.md](01-prd/PRD_GUEST.md) | 비회원·온보딩 | 9 | — |

### 02-runbook/ — 실행·운영
부팅·배포·상태 추적.

| 파일 | 용도 |
|---|---|
| [서비스사용방법.md](02-runbook/서비스사용방법.md) | 30초에 프로젝트 전체 파악하는 종합 가이드 |
| [RUN_EMULATOR.md](02-runbook/RUN_EMULATOR.md) | 에뮬레이터에서 BE+FE 한 번에 띄우기 |
| [DOCKER.md](02-runbook/DOCKER.md) | Docker compose 풀스택 실행 + 트러블슈팅 |
| [PROGRESS.md](02-runbook/PROGRESS.md) | 자율 작업 진행 현황 + 변경 이력 |

### 03-backlog/ — 백로그·외부 의존
남은 작업과 사용자가 직접 해야 할 일.

| 파일 | 용도 |
|---|---|
| [추가작업.md](03-backlog/추가작업.md) | PO 갭 분석 + P0/P1/P2/P3 우선순위 백로그 |
| [CONFIRM_REQUIRED.md](03-backlog/CONFIRM_REQUIRED.md) | 사용자(1인 사업가)가 직접 결정·실행해야 할 15항 (외부 API/계약/법무) |

### 04-claude/ — Claude·에이전트 운영
AI 자율 작업의 정의·범위.

| 파일 | 용도 |
|---|---|
| [AGENTS.md](04-claude/AGENTS.md) | 서브에이전트 9종 정의 (payroll-validator, sodam-designer 등) |
| ../CLAUDE.md | Claude Code 자율 작업 헌법 (루트 유지 — 자동 로드) |

### 05-design/ — 디자인 시스템·UI 산출물
브랜드 톤·와이어프레임·UX 가이드.

| 파일 | 용도 |
|---|---|
| [brand-copy-audit.md](05-design/brand-copy-audit.md) | 톤 헌법 + 영문 치환표 |
| [brand-copy-empty-states.md](05-design/brand-copy-empty-states.md) | 80개 빈 상태 카피 |
| [legacy-screen-audit.md](05-design/legacy-screen-audit.md) | 11 레거시 화면 P0/P1 토큰화 가이드 |
| [wireframes/](05-design/wireframes/) | 12+ 화면 ASCII 와이어프레임 + 마이크로 인터랙션 가이드 |
| [wireframes/admin/](05-design/wireframes/admin/) | 백오피스 ADMIN 9 화면 (O-001~O-901) |

### legal/ — 법무 (변호사 검토 대기)
| 파일 | 상태 |
|---|---|
| [privacy-policy.md](legal/privacy-policy.md) | 초안 — 변호사 검토 필요 |
| [terms-of-service.md](legal/terms-of-service.md) | 초안 — 변호사 검토 필요 |
| [marketing-consent.md](legal/marketing-consent.md) | 초안 — 변호사 검토 필요 |

### security/ — 보안 감사
| 파일 | 용도 |
|---|---|
| [security/SECURITY_AUDIT_2026-05.md](../backend/docs/security/SECURITY_AUDIT_2026-05.md) | (backend/docs/ 에 있음) SSRF·시크릿 점검 |

---

## 🗺 읽기 순서 추천

### 처음 보는 개발자
1. `../README.md` (이 폴더의 부모) — 프로젝트 소개 + 30초 시작
2. `02-runbook/서비스사용방법.md` — 종합 현황 (Claude가 한 작업 + 기존 자산)
3. `02-runbook/PROGRESS.md` — 최신 변경 이력
4. `02-runbook/DOCKER.md` 또는 `RUN_EMULATOR.md` — 부팅

### 제품 의사결정자
1. `00-master-plan/마스터프로젝트개발계획.md`
2. `00-master-plan/PROJECT_IDENTITY.md`
3. `00-master-plan/PRD.md`
4. `01-prd/PRD_*.md` (역할별)

### 다음 작업 시작
1. `03-backlog/추가작업.md`
2. `03-backlog/CONFIRM_REQUIRED.md`
3. `00-master-plan/FEATURES.md` (출시 차단 체크리스트)

### 디자이너
1. `frontend/src/theme/tokens.ts`
2. `05-design/wireframes/`
3. `05-design/brand-copy-audit.md`

---

## 📝 문서 작성 규칙

- 새 문서는 위 카테고리에 맞게 배치
- 루트에는 README.md / CLAUDE.md / docker-compose.yml / .env.example 만 유지
- 문서 간 cross-link 는 상대 경로 사용 (`../00-master-plan/PRD.md` 등)
- 한국어 우선, 코드/기술 용어는 영문 가능
- 본 카탈로그는 새 문서 추가 시 갱신
