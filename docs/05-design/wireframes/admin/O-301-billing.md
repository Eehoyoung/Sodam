# O-301 · 결제 운영 (환불·분쟁·웹훅)

## 목적
결제 이력 모니터링, 분쟁 처리(환불 실행), 웹훅 수신 로그 점검.

## 레이아웃
```
[탭: 구독 / 결제 이력 / 분쟁 / 웹훅 로그]
─────────────────────────────────────────
구독 리스트:
  사용자  플랜       상태       다음결제   카드
  ...    BUSINESS   ACTIVE     06-19     신한**5678
─────────────────────────────────────────
PAST_DUE 일괄 알림 발송 [전송]
```

### 환불 실행 (분쟁 탭)
1. paymentKey 검색
2. 환불 사유 입력 (필수)
3. 비밀번호 재인증
4. [환불 실행] → 빨강 destructive 버튼
5. 토스 API 호출 → 결과 표시

### 웹훅 로그
- 최근 7일 받은 모든 토스 웹훅
- 서명 검증 실패 항목 강조

## API
- `GET /api/admin/billing/subscriptions?status=`
- `POST /api/admin/billing/refund` (paymentKey, reason, password)
- `GET /api/admin/billing/webhook-logs?days=7`

## 권한
환불 실행 → **재인증 + 2FA TOTP**.
