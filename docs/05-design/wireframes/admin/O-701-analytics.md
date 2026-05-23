# O-701 · 데이터·통계

## 목적
KPI 추적, Funnel 분석, Cohort 잔존율, CSV 익스포트.

## 레이아웃
```
[기간 선택: 최근 30일 ▼]
─────────────────────────────────────────
KPI 추이 (차트)
  · 가입 / 유료 전환 / MRR / 이탈
─────────────────────────────────────────
Funnel
  가입 → 매장 등록 → 출근 1회 → 유료 전환
  100   →  78        →  62         →   8
  (100%)   (78%)        (62%)         (8%)
─────────────────────────────────────────
Cohort (월별 잔존율)  [Phase 2]
─────────────────────────────────────────
[CSV 내보내기]
```

## API
- `GET /api/admin/analytics/funnel?days=30`
- `GET /api/admin/analytics/cohort` (Phase 2)
- `GET /api/admin/analytics/kpi?days=30`
- `GET /api/admin/analytics/export.csv?type=kpi&days=`

## 권한
일반 운영자 조회. 데이터 익스포트는 audit_log.
