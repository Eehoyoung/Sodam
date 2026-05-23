# G-002 · 온보딩 캐러셀 3장

## 목적
가입 전 3분 안에 "이 앱은 나에게 쓸만하다"를 느끼게 한다. 핵심 가치 3개 전달.

## 페르소나·진입
- Splash → 비인증 첫 진입 사용자
- 다음: G-003 역할 선택 또는 G-004 가입 방법

## 레이아웃
```
┌─────────────────────────────┐
│          [건너뛰기]            │  → 우측 상단 ghost
├─────────────────────────────┤
│                             │
│       [일러스트 자리]          │
│         260 × 200            │
│                             │
│      📲 NFC 한 번이면 끝      │  ← Display (32pt bold)
│                             │
│  카운터 위 스티커에 폰만        │  ← Body (15pt secondary)
│  대면 자동 출근 인증           │
│                             │
│        ● ○ ○                │  ← 인디케이터 (active: brandPrimary)
│                             │
│    [    다음 →    ]          │  ← Primary, fullWidth, large
└─────────────────────────────┘
```

## 토큰 사양
- 인디케이터 active: `brandPrimary`, 비활성: `surfaceMuted`
- 점 사이즈 8px, gap 8px
- 일러스트 영역: 비율 4:3, 자리는 LinearGradient `gradient.surfaceWarm` placeholder
- 슬라이드 전환: PanGestureHandler + Reanimated (worklets 사용 가능)

## 3장 콘텐츠

### Slide 1 — 출퇴근, NFC 한 번이면 끝
- 이미지: 폰을 NFC 스티커에 대는 일러스트
- 헤드라인: "출퇴근, NFC 한 번이면 끝"
- 본문: "카운터 위 스티커에 폰만 대면 자동 출근 인증. 부정 출근 걱정 끝이에요."

### Slide 2 — 급여, 자동으로 정확하게
- 이미지: 급여 명세서 + 자동 계산기 일러스트
- 헤드라인: "급여, 자동으로 정확하게"
- 본문: "주휴수당·연장·야간 시급 자동 계산. 월말 30분이면 정산 끝나요."

### Slide 3 — 환급까지 한 앱에서
- 이미지: 환급 영수증 + 환한 사장님 일러스트
- 헤드라인: "종합소득세 환급도 한 앱에서"
- 본문: "세무사 부담 없이 환급 받으세요. 환급 받은 만큼만 수수료 드립니다."

## 상태별 변화
- 첫 진입: index=0, "건너뛰기"+"다음"
- 마지막 슬라이드 (index=2): 버튼이 "시작하기"로 변경 + 햅틱 light
- 사용자 좌우 스와이프 시 React Native Reanimated `withSpring` 으로 부드러운 전환

## 엣지케이스
- 이미 한 번 본 사용자 (`AsyncStorage.onboardingSeen=true`) → Splash 에서 G-003 로 즉시 점프
- 건너뛰기 → 동일 동작

## 접근성
- 각 슬라이드 accessibilityRole="adjustable"
- VoiceOver 시 헤드라인+본문 함께 읽기

## API
- 없음 (정적 콘텐츠)

## 구현 메모
- `react-native-reanimated`, `react-native-gesture-handler` 이미 의존성 포함
- 일러스트 자리는 SVG placeholder (외주 전까지 emoji + 그라디언트로 대체)
