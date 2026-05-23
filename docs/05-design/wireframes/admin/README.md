# 백오피스 ADMIN 와이어프레임 (O-001 ~ O-901)

> PRD_ADMIN.md §1 의 9 화면. Next.js 별도 프로젝트 (Phase 2, M6+).
> 모든 화면 `ROLE_ADMIN` 화이트리스트 + 2FA TOTP 권장.

## 화면 목록
1. `O-001-dashboard.md` — 운영 대시보드 (KPI/CS/Sentry)
2. `O-101-users.md` — 사용자 관리
3. `O-201-stores.md` — 매장 관리
4. `O-301-billing.md` — 결제 운영 (환불·분쟁·웹훅)
5. `O-401-cms.md` — 콘텐츠 관리 (노무/세무/정책/팁/FAQ)
6. `O-501-qna-moderation.md` — Q&A 모더레이션
7. `O-601-push.md` — 푸시 발송 (세그먼트 + A/B)
8. `O-701-analytics.md` — 데이터·통계 (Funnel + Cohort)
9. `O-801-system.md` — 시스템 설정 (env·캐시·배치·점검모드)

## 공통 규칙
- 톤: 운영자용 — 명확·간결 (다정한 존댓말 X)
- 위험 액션(환불·강제 비활성·DB 마이그레이션) → 비밀번호 재인증
- 모든 데이터 테이블 sticky header + 가로 스크롤
- 컬러: `tokens.colors.brandPrimary` `#FF6B35` 통일
