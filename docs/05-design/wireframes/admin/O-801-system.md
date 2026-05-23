# O-801 · 시스템 설정

## 목적
운영 환경변수 보기(마스킹), 캐시 무효화, 배치 수동 트리거, 점검 모드 토글.

## 레이아웃
```
[탭: 환경변수 / 캐시 / 배치 / 점검모드 / 감사로그]
─────────────────────────────────────────
환경변수 (마스킹):
  TOSS_SECRET_KEY    sk_***********9876
  JWT_SECRET         ***
  KAKAO_CLIENT_SECRET ***
  (편집은 AWS Secrets Manager 콘솔 직접)
─────────────────────────────────────────
캐시:
  [users] keys: 1,234   [무효화]
  [stores] keys: 56     [무효화]
  [payroll] keys: 89    [무효화]
─────────────────────────────────────────
배치 수동 실행:
  · BillingScheduler  [실행]
  · AttendanceMissingScheduler  [실행]
─────────────────────────────────────────
점검 모드:  ⚪ 비활성  /  🟠 활성 (사용자 안내 메시지: ____)
─────────────────────────────────────────
감사 로그 (최근 100건)
  YYYY-MM-DD HH:MM  user@example  action  detail
```

## API
- `GET /api/admin/system/env-masked`
- `POST /api/admin/system/cache/{name}/invalidate`
- `POST /api/admin/system/batch/{name}/trigger`
- `POST /api/admin/system/maintenance-mode` (toggle)
- `GET /api/admin/system/audit-log?days=`

## 권한
모든 액션 audit_log 기록 + 비밀번호 재인증.
