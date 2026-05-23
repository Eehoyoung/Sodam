# O-101 · 사용자 관리

## 목적
사용자 검색·등급 변경·강제 비활성화. 비밀번호 강제 재설정 메일.

## 레이아웃
```
[검색: 이메일 / 이름 / ID]   [필터: 등급 / 상태]
─────────────────────────────────────────
ID  이메일                  이름   등급     상태   가입일
123 owner@sodam.dev        은영   MASTER   활성   2026-05
124 staff@sodam.dev        지훈   EMPLOYEE 활성   2026-05
...
─────────────────────────────────────────
[CSV 내보내기]                              [페이지 1/N]
```

### 상세 패널 (행 클릭)
- 프로필
- 등급 변경 드롭다운 (Personal / EMPLOYEE / MASTER / ADMIN)
- 강제 비활성화 (사유 입력 필수)
- 비밀번호 강제 재설정 메일 발송
- 구독·결제 이력
- 출퇴근/급여 데이터 읽기 전용 미리보기
- 디바이스 토큰 목록 (강제 제거)

## API
- `GET /api/admin/users?q=&grade=&status=&page=`
- `GET /api/admin/users/{id}`
- `PUT /api/admin/users/{id}/grade`
- `PUT /api/admin/users/{id}/deactivate` (사유 필수)
- `POST /api/admin/users/{id}/force-password-reset`

## 권한
강제 비활성화 / 등급 강등 → 비밀번호 재인증 모달.
