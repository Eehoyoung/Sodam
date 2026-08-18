# 260817 LLM 기능 확장 goal 프롬프트

> `260815_소담_포지셔닝전환_goal.json`과 같은 스키마로 작성한 실행용 goal 프롬프트다.
> 대상은 `docs/260817/260817_LLM_기능확장_계획서.md`의 WP-1~5(우선순위 1~5번, 즉시 착수
> 가능 등급)뿐이다. 6~9번은 이 goal의 범위가 아니다 — `docs/RELEASE_GATES.md`의
> T-17~T-19·G-20으로 이미 이관돼 있다.
>
> **계획서 재검토(2026-08-17)에서 정정한 내용**: 원안 WP-1(교대 요청 사유)·WP-3(구직
> 자기소개)이 가리킨 화면·필드가 실제 코드에 없어서, 코드에 실존하는 자유 텍스트 필드
> (`AttendanceCorrectionRequest.reason`, `JobApplication.message`)로 교체했다. 아래 goal은
> 정정된 버전을 반영한다.
>
> `.json` 대신 `.md`로 저장한 이유: 이 문서 자체가 리뷰 대상이라 커밋 히스토리에서 diff로
> 읽기 좋은 형태가 필요했다. 실제 실행 시에는 아래 코드블록만 떼어 `.json`으로 저장해 써도
> 된다.

```json
{
  "goal_id": "260817-LLM-EXPANSION-WP1TO5",
  "title": "LlmLaborRiskNarrator 재사용 패턴을 5개 도메인(정정사유·주간브리핑·지원메시지·채용공고·매입인사이트)으로 확장",
  "plan_doc": "docs/260817/260817_LLM_기능확장_계획서.md",
  "spec_source_of_truth": "docs/PRD.md",
  "context": {
    "why_now": [
      "260815~16 포지셔닝 전환에서 LlmLaborRiskNarrator 하나가 처음 배선됐고, 익명화→호출→검증→폴백 4단계 패턴이 실전 검증됐다",
      "이 패턴이 노무 리스크 도메인 밖에서도 통하는지 아직 확인된 적이 없다 — 파일럿이 필요하다",
      "9개 확장 후보 중 PII 없음/거의 없음 + 법무·노무 선행조건 없음인 5개만 골랐다. 나머지는 RELEASE_GATES.md T-17~T-19·G-20"
    ],
    "not_goals_of_this_run": [
      "H-6(LLM 유료 실키 활성화) 자체를 켜는 것 — 이 goal의 산출물은 sodam.ai.provider 미설정 상태에서도 전부 동작해야 한다",
      "T-17~T-19·G-20(PII 마스킹 설계·노무사 게이트 필요 항목) 착수",
      "기존 LlmLaborRiskNarrator/LaborRiskService 판정 로직 변경"
    ]
  },
  "prerequisite_before_any_work": {
    "id": "PRE-1",
    "why": ".gitignore에 docs/ 가 있어 신규 문서(docs/260817/)는 자동 추적되지 않고, RELEASE_GATES.md는 이미 추적 중이지만 최근 편집분이 아직 커밋 전이다. 이 조치를 건너뛰면 병렬 worktree에서 계획서·게이트 최신본을 읽을 수 없다.",
    "commands": [
      "git add -f docs/260817/260817_LLM_기능확장_계획서.md",
      "git add -f docs/260817/260817_LLM_기능확장_goal.md",
      "git add -f docs/RELEASE_GATES.md",
      "git commit -m \"docs: LLM 기능 확장 계획서(WP-1~5)·goal 프롬프트 작성 + 게이트 T-17~T-19·G-20 등록\""
    ],
    "verify": "git ls-files docs/260817/ → 2개 파일이 보여야 한다"
  },
  "read_before_start": [
    "docs/260817/260817_LLM_기능확장_계획서.md",
    "docs/RELEASE_GATES.md (T-17~T-19, G-20, H-6)",
    "backend/src/main/java/com/rich/sodam/service/LaborRiskNarrator.java",
    "backend/src/main/java/com/rich/sodam/service/LlmLaborRiskNarrator.java",
    "backend/src/main/java/com/rich/sodam/service/TemplateLaborRiskNarrator.java",
    "frontend/src/features/attendance/screens/AttendanceCorrectionRequestScreen.tsx",
    "backend/src/main/java/com/rich/sodam/domain/AttendanceCorrectionRequest.java",
    "backend/src/main/java/com/rich/sodam/dto/response/WeeklyInsightsResponse.java",
    "backend/src/main/java/com/rich/sodam/controller/StoreInsightsController.java",
    "frontend/src/features/recruitment/screens/JobPostingDetailScreen.tsx",
    "backend/src/main/java/com/rich/sodam/domain/JobApplication.java",
    "backend/src/main/java/com/rich/sodam/dto/request/JobPostingUpsertRequest.java",
    "backend/src/main/java/com/rich/sodam/controller/PurchaseController.java",
    "frontend/src/features/purchase/screens/ReorderHintScreen.tsx"
  ],
  "hard_constraints": [
    {
      "id": "HC-1",
      "rule": "법적 확언 금지",
      "detail": "'막아준다/위반이다/정확하다/법적 자문/안전합니다'를 LLM 프롬프트·검증 금지어 리스트·테스트 픽스처 어디에도 쓰지 않는다. '가능성이 있습니다/확인이 필요합니다' 톤만.",
      "verify": "grep -rn '위반입니다\\|막아드립니다\\|막아줍니다\\|정확하게 계산\\|법적 자문\\|안전합니다' backend/src frontend/src → 이번 커밋 diff 안에서 0건"
    },
    {
      "id": "HC-2",
      "rule": "미확정 정책은 확정 사실로 표시 금지",
      "detail": "이번 5개 WP는 정책 확정성 이슈가 거의 없지만, WP-2(주간 브리핑) 문구에 추세를 단정하는 표현('반드시 늘 것' 등)을 넣지 않는다."
    },
    {
      "id": "HC-5",
      "rule": "경고·제안은 차단이 아니다",
      "detail": "5개 WP 전부 '다듬기 제안'이지 자동 확정이 아니다. 사용자가 검토 후 수정·저장하는 흐름을 유지한다 — LLM 응답을 자동 게시·자동 전송하지 않는다."
    },
    {
      "id": "HC-6",
      "rule": "재사용 패턴 준수, 중복 구현 금지",
      "detail": "LlmLaborRiskNarrator의 Anthropic HTTP 호출·타임아웃·재시도·실패 로깅 로직을 WP마다 새로 베끼지 않는다. WP-0에서 먼저 공용 저수준 클라이언트를 추출한다."
    },
    {
      "id": "HC-7",
      "rule": "외부 AI 없이 완전 동작(fail-safe 기본값)",
      "detail": "sodam.ai.provider 미설정이 기본값이다. 5개 WP 전부 이 상태에서 원본 텍스트 그대로 반환하며 외부 호출 0으로 동작해야 한다."
    },
    {
      "id": "HC-8",
      "rule": "LLM에 PII 전송 금지",
      "detail": "WP-1은 원칙적으로 PII 없음이지만 방어적 검증을 포함한다. WP-3은 지원 메시지에 이름·전화번호가 섞일 수 있어 전송 전 패턴 탐지 마스킹이 필수다(계획서 WP-3 참조) — 이 마스킹 없이 구현을 완료로 보고하지 않는다."
    },
    {
      "id": "HC-9",
      "rule": "Non-Goal 경계 준수(WP-5 전용)",
      "detail": "매입장부 인사이트 코멘트에 '재주문 추천'·'원가율'·'메뉴마진'·'POS 연동' 류 표현이 나오면 반드시 차단한다(docs/RELEASE_GATES.md §7 영구 Non-Goal). 이 도메인 전용 차단 어휘 리스트를 WP-1의 HC-1 금지어 리스트와 별도로 관리한다.",
      "verify": "grep -rn '재주문 추천\\|원가율\\|메뉴마진\\|POS 연동' backend/src/main/java/**/PurchaseInsight* → 0건(코드·주석·테스트 픽스처 전부)"
    },
    {
      "id": "HC-10",
      "rule": "차별 표현 차단(WP-4 전용)",
      "detail": "채용공고 문구에 성별·연령 선호 표현(예: '20대 여성 우대', '남자만')이 섞이면 차단한다(남녀고용평등법·연령차별금지법). 이 검증 규칙 리스트는 법무 확인 전까지 보수적으로(의심스러우면 차단) 설계한다."
    },
    {
      "id": "HC-11",
      "rule": "Flyway 규칙",
      "detail": "5개 WP 전부 신규 컬럼·테이블이 필요 없을 것으로 예상된다. 만약 필요해지면 기존 V파일을 절대 수정하지 말고 V92 이상 신규 파일을 같은 커밋에 작성한다."
    },
    {
      "id": "HC-12",
      "rule": "인가·게이팅 서버 검증",
      "detail": "WP-2(사장 전용)·WP-4(사장 전용)는 @MasterOnly + StoreAuthorizationPolicy. WP-1·WP-3(직원 전용)은 본인 리소스 스코프 검증(타인 정정요청·타인 지원서를 다듬을 수 없어야 함)."
    }
  ],
  "work_packages": [
    {
      "id": "WP-0",
      "name": "공용 LLM 텍스트 정제 인프라 추출",
      "parallel_group": "G1",
      "blocking": true,
      "priority": "P0",
      "rationale": "LlmLaborRiskNarrator에 Anthropic HTTP 호출·타임아웃·에러 로깅이 전부 박혀 있다. WP-1~5가 각자 이걸 복제하면 유지보수가 5배가 된다. 저수준 클라이언트만 먼저 뽑아낸다.",
      "targets": [
        "backend/.../service/LlmLaborRiskNarrator.java (분리 대상, 판정 로직은 그대로 두고 HTTP 호출부만 추출)",
        "backend/.../service/ai/ (신규 패키지 — 저수준 Anthropic 클라이언트)"
      ],
      "tasks": [
        "callAnthropic(prompt) 수준의 저수준 클라이언트를 backend/.../service/ai/AnthropicTextClient.java로 추출(sodam.ai.* 설정 그대로 재사용)",
        "LlmLaborRiskNarrator가 이 클라이언트를 호출하도록 리팩터링 — 기존 동작(비식별화·검증·폴백)은 1바이트도 바꾸지 않는다",
        "도메인별 검증 규칙(금지어·수치보존·Non-Goal 어휘·차별표현 등)은 별도 인터페이스(예: ResponseValidator)로 분리해 WP마다 구현체만 추가하게 한다",
        "provider 미설정 시 이 클라이언트가 생성되지 않거나 즉시 폴백함을 검증하는 테스트"
      ],
      "done_when": [
        "기존 LlmLaborRiskNarratorTest 전량 green(리팩터링으로 동작 변경 없음 증명)",
        "AnthropicTextClient 단위 테스트(타임아웃·파싱 실패·정상 응답) 존재"
      ]
    },
    {
      "id": "WP-1",
      "name": "출퇴근 정정 요청 사유 다듬기",
      "parallel_group": "G2",
      "depends_on": ["WP-0"],
      "priority": "P0",
      "targets": [
        "frontend/src/features/attendance/screens/AttendanceCorrectionRequestScreen.tsx",
        "backend/.../service/ (사유 다듬기 API 신규 또는 기존 AttendanceCorrectionService 확장)",
        "backend/.../service/ai/ (WP-0 산출물 재사용)"
      ],
      "tasks": [
        "정정 사유 다듬기 엔드포인트 신설(본인 소유 리소스 검증 필수 — 타인 정정요청 다듬기 차단)",
        "검증 로직: 금지어(HC-1) + 인명 패턴 방어(HC-8, 낮은 확률이지만 0은 아님)",
        "실패 시 원본 반환 테스트, 5~200자 경계값 테스트",
        "FE '다듬기' 버튼 + 로딩·실패 상태 처리"
      ],
      "done_when": [
        "provider 미설정 상태에서 원본 그대로 반환하는 테스트",
        "타인 정정요청에 대한 다듬기 시도 시 403 테스트",
        "gradlew test / npm test green"
      ]
    },
    {
      "id": "WP-2",
      "name": "사장 주간 브리핑",
      "parallel_group": "G2",
      "depends_on": ["WP-0"],
      "priority": "P0",
      "demo_critical": true,
      "targets": [
        "backend/.../dto/response/WeeklyInsightsResponse.java",
        "backend/.../controller/StoreInsightsController.java",
        "frontend/src/features/home/ (사장 홈 요약 카드)"
      ],
      "tasks": [
        "WeeklyInsightsResponse의 InsightItem 리스트를 요약 문장으로 변환하는 경로 추가(비식별화 단계 없음 — PII 0건)",
        "검증: 카운트 수치가 응답 문장에서 원본과 다르면 폴백(기존 수치보존 검증 재사용)",
        "FE 사장 홈에 요약 카드 추가, LLM 미활성 시 기존 숫자 나열형 폴백"
      ],
      "done_when": [
        "provider 미설정 상태에서 숫자 나열형으로 정상 표시되는 테스트",
        "카운트 값이 응답 문장에서 훼손되면 폴백하는 테스트"
      ]
    },
    {
      "id": "WP-3",
      "name": "채용 지원 메시지 다듬기",
      "parallel_group": "G2",
      "depends_on": ["WP-0"],
      "priority": "P1",
      "targets": [
        "frontend/src/features/recruitment/screens/JobPostingDetailScreen.tsx",
        "backend/.../domain/JobApplication.java",
        "backend/.../service/JobApplicationService.java"
      ],
      "tasks": [
        "지원 메시지 다듬기 엔드포인트 신설(본인 지원서만)",
        "전송 전 인명·전화번호 패턴 탐지 마스킹 전처리 구현(HC-8) — WP-0의 ResponseValidator와 별도로 요청 측 전처리임에 유의",
        "'다듬기'가 사실관계를 지어내지 않는지(원문에 없는 경력·이력 추가 금지) 검증 규칙",
        "FE 지원 메시지 입력창에 '다듬기' 버튼"
      ],
      "done_when": [
        "인명·전화번호 패턴 포함 입력의 마스킹 테스트",
        "타인 지원서에 대한 다듬기 시도 시 403 테스트"
      ]
    },
    {
      "id": "WP-4",
      "name": "채용공고 문구 생성",
      "parallel_group": "G2",
      "depends_on": ["WP-0"],
      "priority": "P1",
      "targets": [
        "backend/.../dto/request/JobPostingUpsertRequest.java",
        "backend/.../service/JobPostingService.java",
        "frontend/src/features/recruitment/screens/OurPostingScreen.tsx (사장용 공고 작성 화면)"
      ],
      "tasks": [
        "구조화 입력(근무형태·업종·시급·근무일시) → 200자 소개문 초안 생성 엔드포인트",
        "차별 표현 검증 규칙 신설(HC-10) — 성별·연령 선호 문구 차단 어휘 리스트를 별도 상수 클래스로 분리(법무 확인 후 교체 용이하게)",
        "양성/음성 사례 테스트(정상 문구 통과, 차별 표현 차단)"
      ],
      "done_when": [
        "차별 표현 차단 테스트 5건 이상(성별·연령 조합)",
        "정상 문구가 오탐으로 차단되지 않는 테스트"
      ]
    },
    {
      "id": "WP-5",
      "name": "매입장부 인사이트 코멘트",
      "parallel_group": "G2",
      "depends_on": ["WP-0"],
      "priority": "P1",
      "targets": [
        "backend/.../controller/PurchaseController.java (vendor-summary, 가격비교)",
        "frontend/src/features/purchase/screens/ (거래처 집계·가격비교 화면)"
      ],
      "tasks": [
        "거래처별 집계·품목 단가 추이 응답을 코멘트 문장으로 변환하는 경로 추가",
        "Non-Goal 차단 어휘 리스트 신설(HC-9) — '재주문 추천'·'원가율'·'메뉴마진'·'POS 연동' 등",
        "ReorderHintScreen 기존 면책 문구 톤 계승",
        "Non-Goal 표현이 섞인 응답을 시뮬레이션해 차단되는지 확인하는 테스트"
      ],
      "done_when": [
        "Non-Goal 어휘 포함 응답이 폴백되는 테스트",
        "N- 경계 관련 코드 리뷰 체크리스트 통과(사람 확인 권장 — HC-9 verify와 별개로 리뷰 시점에 한 번 더 확인)"
      ]
    }
  ],
  "execution_order": [
    {
      "group": "G1",
      "mode": "sequential",
      "wps": ["WP-0"],
      "note": "WP-1~5 전부가 이 산출물(AnthropicTextClient)에 의존한다 — 반드시 먼저"
    },
    {
      "group": "G2",
      "mode": "parallel",
      "wps": ["WP-1", "WP-2", "WP-3", "WP-4", "WP-5"],
      "note": "파일 교집합 낮음(WP-3·WP-4가 같은 recruitment 도메인이지만 다른 클래스). worktree 분리 가능"
    }
  ],
  "verification": {
    "commands": [
      "cd backend; .\\gradlew test",
      "cd frontend; npm test",
      "cd frontend; npm run lint"
    ],
    "gates": [
      "backend/frontend 테스트 전량 green",
      "lint error 0 유지, warning 총량 증가 금지",
      "HC-1 금지어 grep 0건(diff 범위)",
      "sodam.ai.provider 미설정 상태에서 5개 WP 전부 외부 호출 0으로 동작",
      "WP-5 Non-Goal 어휘 grep 0건",
      "WP-4 차별 표현 차단 테스트 존재",
      "WP-1·WP-3 타인 리소스 접근 403 테스트 존재",
      "기존 LlmLaborRiskNarratorTest 전량 green(WP-0 리팩터링 후에도)"
    ]
  },
  "escalate_to_human_when": [
    "H-6(LLM 유료 실키) 활성화가 필요하다고 판단될 때 — 이 goal 범위 밖",
    "WP-4 차별 표현 차단 어휘 리스트의 적정성이 애매할 때(법무 확인 권장 항목)",
    "WP-5에서 Non-Goal 경계 여부 판단이 애매할 때",
    "신규 DB 컬럼·테이블이 불가피할 때",
    "5개 WP 중 하나가 실제로는 더 넓은 리팩터링을 요구한다고 판단될 때(스코프 확장 전 보고)"
  ],
  "report_format": {
    "per_wp": [
      "변경 파일 목록",
      "신규 테스트와 커버 범위",
      "검증 명령 실행 결과",
      "미해결 항목과 사유"
    ],
    "final": [
      "WP-0~5 전부 done_when 충족 여부",
      "HC-1~HC-12 위반 여부 자체 점검",
      "provider 미설정 상태 전 기능 동작 재확인 결과"
    ]
  }
}
```
