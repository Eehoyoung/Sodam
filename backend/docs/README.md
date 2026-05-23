# 소담(SODAM) 문서 인덱스 v1.0

## 📋 개요
- 작성일: 2025-12-06
- 작성자: 문서관리 오너(BE 리드)
- 문서 유형: 인덱스/내비게이션
- 관련 이슈: 문서고도화, FE PRD 정렬, OpenAPI 정합성

## 🎯 목적
소담 프로젝트의 모든 문서를 일관된 구조로 안내하고, 핵심 표준 문서에 빠르게 접근할 수 있도록 인덱스를 제공합니다.

## 📚 디렉토리 구조(요약)
```
docs/
├── guidelines/          # 개발 가이드라인 및 표준
├── project-management/  # 계획/체크리스트/타임라인
├── technical/           # 기술 설계/구현 상세
│   └── api/             # API 표준/권한/스펙 관련
├── reports/             # 완료 보고서/분석 보고서
└── FE_BE_Collaboration/ # FE/BE 협업 산출물
```

## 🔗 핵심 문서 바로가기
- 프로젝트 전반
  - [FE PRD 요청서](./FE_PRD_요청서.md)
  - [FE-PRD 대응 BE 답변서](./FE_BE_Collaboration/251206_FE_PRD_요청서_BE_답변서.md)
  - [문서고도화 작업계획 및 체크리스트](./project-management/251206_문서고도화_작업계획_및_체크리스트.md)
- API 표준
  - [표준 응답 및 에러 모델](./technical/api/표준_응답_및_에러_모델.md)
  - [API 버전/환경 정책](./guidelines/api_versioning_and_environments.md)
  - [권한/스코프 매트릭스](./technical/api/permissions_matrix.md)
- 비기능/운영
  - [NFR/SLO/Rate Limit 정책](./technical/nfr_slo.md)
- 사양
  - [OpenAPI 사양(ApiList.yaml)](../ApiList.yaml)

## 🧭 작성 원칙 요약
- 모든 문서는 한국어 작성(코드/스키마 예시 제외 가능)
- 표준 문서 구조 준수: 개요/목적/내용/관련 문서/변경 이력
- 코드/스키마 블록은 언어에 맞는 구문 강조 사용

## 🔗 관련 문서
- [common-docs/문서_통합_인덱스](../common-docs/report_251015/문서_통합_인덱스.md)
- [API 고급 개발자 가이드](../common-docs/report_251015/API_고급_개발자_가이드.md)

## 📅 변경 이력
날짜 | 버전 | 변경 내용 | 작성자
------|------|-----------|------
2025-12-06 | 1.0 | 최초 작성 | BE 팀
