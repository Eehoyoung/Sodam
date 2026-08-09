# 소담(Sodam) Codex 가이드

소담은 소상공인 매장의 출퇴근, 급여, 스케줄을 관리하는 React Native 및 Spring Boot 애플리케이션이다. 사장(Master)과 직원(Employee)의 핵심 흐름은 매장 등록, 직원 입사, 출퇴근 기록, 스케줄 확정, 급여 정산이다.

## 사양 우선순위

- 기능을 추가하거나 변경하기 전에 `docs/PRD.md`의 해당 도메인 섹션을 먼저 읽는다.
- 역할별 발췌본은 `docs/PRD_MASTER.md`와 `docs/PRD_EMPLOYEE.md`다.
- 문서가 충돌하면 `docs/PRD.md`를 우선한다.

## 진행 중인 작업 (릴레이 인수인계)

- **매입장부(F-BUY-01) 에뮬레이터 실기 검증** — 인수인계 문서: `docs/260804/260804_매입장부_Codex_에뮬레이터검증_인수인계.md`. 갭수정·고도화 구현(커밋 `edbc656`, `30e18a3`, 둘 다 push 완료)은 자동테스트(BE/FE)로만 검증된 상태이고 에뮬레이터 실기 확인이 남아있다. 화면별 체크리스트·검증 명령어·CLOVA 실키 활성화 금지 안내가 이 문서 하나에 정리돼 있다. 이 영역 작업 요청을 받으면 먼저 이 문서를 읽는다.
- **디자인 시스템 v3("링 & 패스") 153화면 적용** — 인수인계 문서: `docs/260720/260726_V3_Codex_인수인계_및_다음작업.md`. 이 문서 하나로 진척도·디자인 시안(13개 아티팩트 HTML) 접근 방법·다음 작업 우선순위·작업 순서도·검증 명령어를 전부 확인할 수 있다. 이 영역 작업 요청을 받으면 먼저 이 문서를 읽는다.
- **주의**: `docs/`, `*.md`, `*.html`은 `.gitignore`로 커밋 대상에서 제외되어 있어(이 파일 `AGENTS.md`도 포함) 별도 clone/worktree에는 존재하지 않을 수 있다. 위 인수인계 문서를 찾을 수 없다면 이 저장소의 로컬 작업 디렉터리인지 먼저 확인한다.

## Claude 지침 동기화 사항

- `CLAUDE.md`의 현재 제품 결정도 이 파일과 함께 Codex 작업 지침으로 적용한다. 사양 충돌은 `docs/PRD.md`, 작업 규칙은 `.claude/rules/`, 출시 보류·Non-Goal은 `docs/RELEASE_GATES.md`를 각각 우선한다.
- iOS는 아직 Android만큼 실기 검증되지 않았다. iOS 1차에서는 NFC 출퇴근을 노출하지 않으며, Apple Developer·Xcode·APNs·Kakao 콘솔 Redirect URI·운영 환경변수 설정은 사람 전용 외부 작업이다. iOS 결제 진입점과 App Store IAP 정책은 사용자 판단 전까지 확장하지 않는다.
- 결제·구독 변경은 `docs/PRD.md` §4.8과 기존 정책을 먼저 대조한다. `SODAM_INTEGRATION_TOSS_MODE=mock`을 기본으로 유지하고, live 자격증명 설정·운영 청구·유료 OCR(CLOVA) 활성화는 명시적 인간 승인 없이는 수행하지 않는다.
- 근로계약·연차·근태이상/알림 변경은 `docs/PRD.md` §4.7을 먼저 읽고, 계약 상태 전이와 연차 경계값을 테스트한다. `CONTRACT_MANAGE`와 `PAYROLL_CONFIRM` 부여 흐름은 노무사 게이트가 해소되기 전 확장·개방·홍보하지 않는다.
- 약관·개인정보처리방침·결제 고지 초안은 법무·세무·노무 검토를 서로 독립적으로 마친 뒤에만 작성한다. 의견이 충돌하거나 최신 법령 확인이 필요한 경우 임의로 절충하지 말고 사용자 판단을 요청한다.
- `docs/`는 대부분 Git 이력 없는 로컬 문서다. 삭제 대신 `docs/archive/`로 이동하고, 이동 전 `CLAUDE.md`·`AGENTS.md`·코드의 참조를 검색해 라이브 문서 경로를 함께 갱신한다.

## 작업지시 가공

- 코드 작성, 수정, 조사, 버그 수정, 리팩토링, 설계 검토처럼 실제 작업으로 이어지는 요청은 메인 작업 전에 프롬프트 엔지니어가 먼저 가공한다.
- 프롬프트 엔지니어는 사용자 원문 의도를 보존하면서 목표, 대상 파일/영역, 세부 작업, 관련 프로젝트 규칙, 확인 필요 사항으로 재구성한다.
- 프롬프트 엔지니어는 코드를 수정하거나 파일을 생성하지 않는다. 실제 수정, 실행, 테스트는 메인 에이전트가 수행한다.
- 단순 설명 요청, 일반 대화, 이미 합의된 작업의 짧은 후속 지시, 결과 요약 요청에는 프롬프트 엔지니어를 사용하지 않는다.
- 대규모 배선 파악, 영향 범위 추적, 호출 관계 분석이 필요한 요청이면 프롬프트 엔지니어는 Graphify 사용이 적합한지 판단하고, 적합하면 구체적인 `graphify query/explain/path/affected` 명령을 작업지시에 포함한다.
- Codex에서 별도 `prompt-engineer` 에이전트가 노출되지 않은 경우에도 메인 에이전트가 같은 형식으로 작업지시를 먼저 정리한 뒤 실행한다.

## 저장소 구조

- `backend/`: Spring Boot 3.4.5, Java 17, Gradle, 패키지 루트 `com.rich.sodam`
- `frontend/`: React Native 0.81, React 19, TypeScript, 기능별 `src/features/<domain>/`
- `docker-compose.yml`: 백엔드, MySQL, Redis, Adminer 개발 스택
- 루트의 다수 `*.png`, `*.xml`: 에뮬레이터 E2E 산출물이므로 일반 작업에서 무시

## 고정 포트

| 서비스 | 포트 |
|---|---:|
| Backend API | 7070 |
| Metro | 8088 |
| MySQL | 13306 |
| Redis | 16379 |
| Adminer | 18080 |

백엔드 API에 8080을 사용하지 않는다. Android 에뮬레이터의 Metro 주소는 `10.0.2.2:8088`이다.

## 빌드 및 검증

```powershell
# 전체 개발 환경: Docker 빌드, npm 설치, APK 빌드, 에뮬레이터 2대, Metro
.\run-dev.ps1

# Backend (backend/에서)
.\gradlew.bat test
.\gradlew.bat build -x test
.\gradlew.bat bootRun --args='--spring.profiles.active=dev'

# Frontend (frontend/에서)
npm run lint
npm run test:unit
npm run android

# Full stack (루트에서)
docker compose up -d
docker compose ps
docker compose logs sodam-be
```

변경 범위에 맞는 테스트를 실행한다. 버그 수정은 가능하면 실패 테스트로 재현한 뒤 수정한다. 테스트를 비활성화하거나 스킵해 실패를 숨기지 않는다.

## 아키텍처 핵심

- Backend 레이어는 `controller -> service -> repository -> domain` 순서다. 급여 계산은 `core/payroll/`에서 수정한다.
- 매장 범위 API는 JWT와 `StoreAccessGuard`로 BOLA를 차단한다. 가드 호출은 예외를 삼키지 않도록 `try` 블록 밖에 둔다.
- STOMP WebSocket은 `/ws`, 토픽은 `/topic/store.{storeId}`이며 트랜잭션 `afterCommit` 이후 발행한다.
- 캐시 어노테이션은 외부에서 호출되는 public 프록시 진입점에 둔다. `this.method()` 자기 호출은 AOP를 우회한다.
- Frontend API는 feature의 `services/` 계층을 사용한다. 기존 `api.get` 호출 패턴을 따르고 params 이중 래핑을 피한다.
- 쓰기 후 목록 갱신은 기존 `useFocusEffect`와 refetch 패턴을 따른다.
- 만료 또는 무효 토큰은 401, 권한 부족은 403을 반환한다.

## Spring 프로필과 DB

- `dev`: H2, `ddl-auto=create-drop`, Flyway 비활성, 외부 통합 mock, `DevSeedRunner` 사용
- `prod`: MySQL, Flyway, `ddl-auto=validate`; 로컬 Docker Compose도 이 경로 사용
- `test`: `backend/src/test/resources/application-test.yml`
- JPA 엔티티 변경 시 새 `backend/src/main/resources/db/migration/V*.sql`을 같은 변경에 포함한다.
- 기존 Flyway 마이그레이션 파일은 수정하지 않는다.
- dev에서는 `SODAM_INTEGRATION_KAKAO_MODE=mock`을 유지한다.

## 세부 규칙

작업 영역에 해당하는 규칙을 반드시 읽고 적용한다.

- 테스트: `.claude/rules/testing.md`
- API와 DB: `.claude/rules/api-design.md`
- React Native: `.claude/rules/frontend.md`
- 인가, PII, 시크릿: `.claude/rules/security.md`

`.claude/rules`가 프로젝트 규칙의 단일 원본이다. Codex 전용 에이전트도 이 경로를 참조한다.

## 작업 안전성

- 기존 사용자 변경을 되돌리지 않는다. 작업 전후 `git status --short`와 관련 diff를 확인한다.
- `.env` 및 실제 시크릿을 읽거나 수정하거나 커밋하지 않는다. `.env.example`만 예외다.
- PII 원문과 GPS 좌표를 로그에 남기지 않는다.
- 엔티티를 API 응답으로 직접 반환하지 않고 DTO로 필요한 필드만 노출한다.
- UI 변경은 실제 에뮬레이터 화면으로 확인하며, 가능하면 스크린샷과 UI 트리를 함께 검증한다.

## 커밋

사용자가 커밋을 요청한 경우 한국어 메시지와 `feat:`, `fix:`, `refactor:`, `docs:` 접두사를 사용한다. 관련 없는 변경은 커밋에 포함하지 않는다.

## Codex 확장

- 프로젝트 설정: `.codex/config.toml`
- 프로젝트 훅: `.codex/hooks.json`, `.codex/hooks/`
- 프로젝트 에이전트: `.codex/agents/`
- 프로젝트 스킬: `.agents/skills/`
- 에이전트는 설명에 맞는 전문 작업에만 사용하고, 읽기 전용 에이전트는 코드를 수정하지 않는다.

## Graphify 운용

- `graphify` 실행 파일은 `C:\Users\LeeHoYoung\.local\bin\graphify.exe`에 설치되어 있다.
- 현재 Claude는 `.claude/settings.json`의 `PreToolUse` 훅으로 `graphify hook-guard search/read`를 자동 실행한다.
- Codex는 Claude 훅을 자동으로 실행하지 않는다. `.codex/config.toml`과 `.mcp.json`에 `graphify` MCP 서버가 없으므로, Codex에서는 Graphify가 별도 도구로 자동 주입되지 않는다.
- Codex에서 Graphify가 필요하면 PowerShell에서 CLI로 직접 호출한다. 예: `graphify query "LoginScreen" --graph graphify-out/graph.json --budget 2000`, `graphify explain "노드명"`, `graphify path "A" "B"`, `graphify affected "노드명"`. 한국어 자연어 질문보다 실제 파일명, 클래스명, 함수명 같은 그래프 노드명 기반 질의가 안정적이다.
- 과금 금지 원칙: 사용자에게 명시 승인을 받기 전에는 LLM/API 비용이 발생할 수 있는 Graphify 명령을 실행하지 않는다.
- 기본 허용 명령은 기존 그래프를 읽는 `graphify query`, `graphify explain`, `graphify path`, `graphify affected`, `graphify tree`, `graphify check-update`와 로컬 코드 인덱싱 전용 `graphify update . --code-only`, `graphify extract . --code-only`로 제한한다.
- 금지 명령은 사용자 명시 승인 전까지 `graphify extract .`, `graphify extract . --mode deep`, `graphify label`, `graphify cluster-only`처럼 LLM 백엔드나 API 키를 사용할 수 있는 실행이다. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` 등 API 키가 환경에 있으면 특히 실행하지 않는다.
- 그래프가 없거나 오래됐으면 읽기 전용 분석 목적에 한해 `graphify update . --code-only` 또는 `graphify extract . --code-only`로만 갱신한다. LLM 기반 심화 추출이 필요하면 예상 비용, 사용할 백엔드, 실행 명령을 사용자에게 먼저 보고하고 승인 후 진행한다.
- 비용 확인이 필요하면 `graphify-out/cost.json`을 확인한다. 현재 비용 기록이 0이어도 이후 LLM 명령 실행 시 과금될 수 있으므로 기본값을 무료 모드로 유지한다.
- `graphify-out/`과 `.graphify/`는 로컬 산출물이므로 커밋하지 않는다. `.graphifyignore`와 `.gitignore`를 존중하며, `.env`, 실제 시크릿, PII 원문, 서명/인증서 파일을 그래프 입력에 포함하지 않는다.
- 대규모 배선 파악, 영향 범위 추적, 메서드 이동 계획, 호출 경로 설명이 필요할 때 `rg`/Serena와 함께 Graphify 결과를 참고한다. Graphify 결과는 보조 근거로 사용하고, 최종 변경 전에는 실제 소스와 테스트로 확인한다.
