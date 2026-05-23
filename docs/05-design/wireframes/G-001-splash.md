# G-001 · Splash

## 목적
앱 첫 진입 시 1~1.5초 동안 브랜드 인상을 전달하고 인증 상태에 따라 분기.

## 페르소나·진입
- 콜드 스타트, 푸시 알림 클릭, 딥링크 진입 모두 통과
- 다음: 비인증 → 온보딩(G-002) / 인증 → 홈

## 레이아웃
```
┌─────────────────────────────┐
│      [브랜드 그라디언트]      │
│  #FF7A1A → #FF5722 대각선    │
│                             │
│         (중앙 정렬)          │
│       ┌───────────┐         │
│       │  소담 로고   │         │
│       │  120 × 120  │         │
│       └───────────┘         │
│                             │
│      소  담                  │
│      (40pt bold, white)     │
│                             │
│   소상공인을 담다             │
│   (14pt regular, white 80%) │
│                             │
│      (1.0s 후 페이드)        │
│                             │
└─────────────────────────────┘
```

## 토큰 사양
- 배경: `LinearGradient` colors=`tokens.gradient.brand`, angle 135°
- 로고: SodamLogo size=120, variant="full", `textInverse`
- 슬로건: `typography.sizes.sm`, `weights.regular`, opacity 0.85
- 페이드: `Animated.timing` duration=`motion.durationSlow` (400ms)

## 상태별 변화
- LOADING: 표시 (최소 0.8s + 부트 완료 기다림)
- READY (auth=true): NavigationContainer reset → `HomeRoot`
- READY (auth=false): reset → `Welcome`(온보딩)
- ERROR (부팅 실패): "다시 시도" 버튼 노출, 5초 후 자동 재시도

## 엣지케이스
- 1.5s 초과 부팅 → 무한 로딩 X. 스피너로 전환하고 텍스트 "준비 중이에요"
- 네트워크 끊김 시 인증 검증 실패 → 비인증으로 처리

## 접근성
- accessibilityRole="image", label="소담 — 소상공인을 담다"
- announceForAccessibility on focus

## API
- 사일런트: `GET /api/auth/me` — 캐시 액세스 토큰 검증
