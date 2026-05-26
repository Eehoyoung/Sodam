# Sodam Launch Redesign Package

작성일: 2026-05-25  
범위: 코드 수정 없이 작성한 출시형 디자인 산출물  
원칙: 모바일 우선, 역할별 홈 분리, 즉시 행동 가능한 업무 UX, 따뜻하지만 프로페셔널한 브랜드

## 산출물

| 파일 | 목적 |
|---|---|
| `00-agent-personas.md` | 6개 하위 에이전트 페르소나와 임무 정의 |
| `01-executive-design-brief.md` | 최고 디자인 방향, 유지/폐기 원칙, 출시 디자인 컨셉 |
| `02-ia-navigation.md` | 역할별 IA, 탭/스택 구조, 라우팅 재설계 |
| `03-screen-storyboards.md` | 주요 화면별 스토리보드와 상태 설계 |
| `04-wireframes.md` | 텍스트 와이어프레임, 화면 레이아웃, 화면별 CTA |
| `05-design-system.md` | 컬러, 타이포, 로고, Header/Footer/Button/Card 규격 |
| `06-responsive-accessibility-qa.md` | 반응형, 접근성, 상태 화면 QA 체크리스트 |
| `07-interaction-storyboards.md` | 버튼/팝업/바텀시트/성공/실패까지 포함한 세부 스토리보드 |
| `08-micro-design-final-spec.md` | 토스트, 배지, 입력, 바텀시트, 모달 등 사소한 UI 최종 명세 |
| `09-copy-and-state-library.md` | CTA, 오류, 빈 상태, 성공, 알림 문구 라이브러리 |
| `10-final-design-ownership-checklist.md` | 최종 디자인 책임 범위와 완료 체크리스트 |
| `design-tokens.json` | 구현자가 바로 참고할 수 있는 디자인 토큰 |
| `screen-inventory.csv` | 현재 FE 화면의 보존/개편/폐기 판단 |
| `screen-coverage-matrix.csv` | 실제 FE 화면 파일과 최종 HTML 목업 번호 매핑 |
| `interaction-map.csv` | 스크린별 트리거와 연결 대상 매핑 |
| `prototypes/sodam-launch-redesign.html` | 브라우저에서 바로 열어보는 고충실도 HTML 시안 |
| `prototypes/sodam-screen-gallery.html` | 각 주요 스크린별 디자인 예시 갤러리 |
| `prototypes/sodam-final-all-screens.html` | 모든 주요/보조/마이크로 스크린 83개 확정 디자인 HTML, 반응형 포함 |
| `prototypes/SodamLaunchMock.tsx` | React Native 구현 참고용 샘플 TSX |
| `11-gap-analysis-and-additions.md` | (추가) PM 갭 분석 — 82목업 외 출시 필요 화면/상태 18종, P0 5종 |
| `prototypes/sodam-additional-owner.html` | (추가) 사장/매장/급여·결제 보강 시안 11종 (결제실패·콜드스타트·정산불가·태블릿2열 등) |
| `prototypes/sodam-additional-employee.html` | (추가) 직원/개인/공통상태·접근성 보강 시안 11종 (오프라인·세션만료·권한복구·큰글자·다크 등) |

## 최종 디자인 한 줄

소담은 작은 가게의 오늘 할 일을 1초 안에 보여주고, 5초 안에 행동하게 만들며, 월말 정산을 믿고 끝내게 하는 따뜻한 모바일 운영 비서다.

## 핵심 결정

- 첫 화면은 마케팅 랜딩이 아니라 역할 선택과 즉시 시작 경험이다.
- `MasterMyPageScreen`과 `OwnerDashboard`의 중복은 `OwnerHome` 중심으로 정리한다.
- 직원은 앱을 켜면 큰 출근/퇴근 CTA 하나만 먼저 본다.
- 사장은 앱을 켜면 오늘 미출근, 이상 출퇴근, 이번 달 인건비, 정산 CTA를 먼저 본다.
- 개인 사용자는 회사 승인 없는 개인 근무 기록장으로 분리한다.
- Header는 모바일 앱형으로 단순화하고, Footer는 앱 내부에서 법적/지원 정보로 축소한다.
- 기존 기능 재료는 살리되, 화면 구조와 시각 언어는 출시형으로 재정렬한다.

## 디자인 미리보기

브라우저에서 아래 파일을 열면 전체 컨셉을 한 번에 볼 수 있다.

`docs/05-design/launch-redesign/prototypes/sodam-launch-redesign.html`

각 화면별 예시는 아래 파일에서 볼 수 있다.

`docs/05-design/launch-redesign/prototypes/sodam-screen-gallery.html`

전체 스크린 확정 디자인은 아래 파일을 기준으로 한다.

`docs/05-design/launch-redesign/prototypes/sodam-final-all-screens.html`
