# 와이어프레임 — `sodam-designer` 산출물

> AGENTS.md §8 의 `sodam-designer` 에이전트 룰을 따른 화면 사양.
> ASCII 와이어 + 토큰 키 + 상태별 UX + 엣지케이스를 한 파일에 압축.
> 개발자(또는 Claude)는 본 와이어프레임을 1:1 으로 .tsx 구현.

## 작성된 화면

### 신규 12 화면 (D0/W1)
- `G-001-splash.md`
- `G-002-onboarding-carousel.md`
- `G-006-password-reset.md`
- `G-007-signup-with-consent.md`
- `G-009-welcome-after-signup.md`
- `S-201-employee-detail.md`
- `S-301-payroll-run-flow.md`
- `S-501c-wage-settings.md`
- `S-601-missing-attendance-center.md`
- `E-101-attendance-calendar.md`
- `E-301-join-store-by-code.md`
- `E-501-notification-center.md`
- `Settings-notification-prefs.md`

### 레거시 토큰화 가이드 (D0/W2)
- `legacy-tokenization-guide.md` (LoginScreen·SignupScreen·HomeScreen·AttendanceScreen 등)

## 디자인 원칙 (brand constitution)

1. **Primary `#FF6B35`** — 모든 핵심 CTA, 활성 상태
2. **Brand gradient** (`tokens.gradient.brand` `#FF7A1A → #FF5722`) — 환영/대형 CTA 한정
3. **`#1C1917 / #57534E`** — Text 위계, 본문은 Primary만 Secondary 보조
4. **warm gray surface** — `surface`, `surfaceMuted` (차가운 회색 금지)
5. **터치 영역 44pt+** — 모든 인터랙티브 요소
6. **그림자 절제** — 기본 `shadow.md`, 모달만 `shadow.lg`, CTA 만 `shadow.brand`
7. **모서리** — 카드 12pt(`radius.lg`), 버튼 12~16pt
8. **그라디언트 남발 X** — 환영·CTA 동그라미·결제 성공 한정
9. **시스템 폰트** — 별도 폰트 번들 X (앱 크기/부팅 최적화)
10. **마이크로 인터랙션** — press scale 0.97, 햅틱 가벼움 (성공만)

## 톤 가이드

- "사장님" / "○○님" 호칭 일관
- 다정한 존댓말 ("이용해 주세요" / "확인해 주세요")
- 금지어: **혁신, AI 기반, 스마트, 첨단** (1인 사업가 페르소나에 부적합)
- 빈 상태: 책망 X, 다음 행동 안내 ("아직 매장이 없어요 — 매장 코드를 받으셨나요?")
- 에러 상태: 사용자 책임이 아님 ("잠시 후 다시 시도해 주세요 — 우리 잘못이에요")
