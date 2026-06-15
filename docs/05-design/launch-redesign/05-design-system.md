# Design System

## Brand

소담의 UI는 “작은 가게의 오늘 할 일을 바로 끝내는 따뜻한 업무 도구”다.

## Experience Principle

`Toss-like simplicity, Sodam-specific warmth`

- 복잡한 노동/급여/세무 정보를 한 문장, 한 숫자, 한 CTA로 압축한다.
- 버튼을 많이 보여주는 대신 사용자가 지금 누를 버튼을 정확히 보여준다.
- 시각적으로는 친숙하고 차분하지만, 상태 전환과 마이크로카피는 영리해야 한다.
- “멋있다”보다 “아, 이거 진짜 편하다”가 먼저 나오게 한다.

## Color

| Token | Value | Usage |
|---|---:|---|
| `brand.primary` | `#FF6B35` | 1차 CTA, 선택 상태 |
| `brand.primaryPressed` | `#E85A2A` | Pressed |
| `brand.primarySoft` | `#FFF0E8` | 연한 배경 |
| `brand.secondary` | `#243B4A` | 보조 강조, 진한 헤더 텍스트 |
| `surface.background` | `#FFFFFF` | 기본 화면 |
| `surface.canvas` | `#F7F4EF` | 앱 배경 |
| `surface.warm` | `#FFFBF5` | 따뜻한 카드 |
| `surface.mint` | `#EEF8F4` | 성공/출근 보조 배경 |
| `surface.sky` | `#EEF5FF` | 정보 보조 배경 |
| `text.primary` | `#201A17` | 본문 |
| `text.secondary` | `#625B55` | 보조 텍스트 |
| `text.tertiary` | `#9A9189` | 캡션 |
| `border.default` | `#E8E0D8` | 입력/카드 경계 |
| `status.success` | `#12A87B` | 성공, 출근 |
| `status.warning` | `#F59E0B` | 주의, 미출근 |
| `status.error` | `#E5484D` | 오류, 삭제 |
| `status.info` | `#3B82F6` | 정보 |

## Palette Rule

- Primary 오렌지는 화면당 1개 주요 행동에만 강하게 쓴다.
- 업무 화면은 `surface.canvas`와 흰색 카드 중심으로 설계한다.
- 그라디언트는 Splash, RoleStart, Login/Signup의 상단 혹은 배경에만 쓴다.
- 상태는 색만 쓰지 않고 텍스트 배지와 아이콘을 함께 쓴다.

## Typography

| Style | Size / Line | Weight | Usage |
|---|---|---:|---|
| `display` | 32 / 38 | 700 | 브랜드 진입 |
| `headingLg` | 26 / 34 | 700 | 온보딩 타이틀 |
| `headingMd` | 22 / 30 | 700 | 화면 제목 |
| `headingSm` | 18 / 26 | 700 | 카드 제목 |
| `titleMd` | 15 / 22 | 600 | 리스트 제목 |
| `bodyLg` | 17 / 26 | 400 | 주요 본문 |
| `bodyMd` | 15 / 23 | 400 | 기본 본문 |
| `caption` | 12 / 16 | 400 | 보조 정보 |
| `numericLg` | 28 / 34 | 700 | KPI/금액 |

## Logo

### 권장 구조

- `symbol`: 앱 아이콘/스플래시, 64px 이상
- `mark`: Header/Tab, 24~32px
- `wordmark`: 소담 텍스트 결합형
- `mono`: 흰색/검정 단색

### 개선 방향

- 작은 로고에서 내부 텍스트 제거
- 하트 또는 둥근 사각 심볼로 단순화
- `SOODAM`, `Sodam`, `소담` 표기를 목적별로 고정
- 한국어 제품명은 앱 내부에서 `소담`을 기본으로 사용

## Header

| Item | Spec |
|---|---|
| Height | 56 |
| Background | `surface.background` |
| Border | `border.divider` 1px |
| Left | back/menu/logo 중 하나 |
| Center | title |
| Right | 최대 2개 아이콘 |

금지:
- 텍스트 nav 버튼 3개 이상 나열
- Header 전체를 진한 블루/오렌지로 고정
- 화면마다 다른 높이

## Footer

앱 내부에서는 반복 Footer를 제거한다.  
법적 정보와 사업자 정보는 `MyPage > 정보` 또는 설정 화면 하단에 축소 표시한다.

웹/랜딩이 필요한 경우:
- 배경 `brand.secondary`
- 2~3열 이하
- 약관, 개인정보, 문의, 사업자 정보만 노출

## Button

| Variant | Usage |
|---|---|
| `primary` | 화면의 1차 행동 |
| `secondary` | 진한 보조 행동 |
| `outline` | 보조 CTA |
| `ghost` | 리스트/헤더 경량 액션 |
| `destructive` | 삭제/탈퇴 |
| `invertedPrimary` | 어두운 배경 위 CTA |

크기:
- `sm`: 시각 36, 터치 44 확보
- `md`: 48
- `lg`: 56

## Card

| Variant | Usage |
|---|---|
| `flat` | 기본 정보 구획 |
| `elevated` | 핵심 요약/홈 카드 |
| `outlined` | 선택 가능한 카드 |
| `warm` | 추천/인사이트 |

규칙:
- 카드 안 카드 금지
- 반복 아이템 카드 radius 8~12
- 홈의 핵심 요약만 16 radius 허용

## Components Required

- `ScreenContainer`
- `AppHeader`
- `AppButton`
- `AppInput`
- `AppCard`
- `AppBadge`
- `AppListItem`
- `BottomTab`
- `CtaStack`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `PermissionState`
