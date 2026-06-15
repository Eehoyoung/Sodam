# 소담 디자인 시스템 v2 — 마스터 사양 (DESIGN_SYSTEM_V2_SPEC)

- 일자: 2026-05-24
- 작성: Claude (디자인 디렉터 모드)
- 상태: **사양 확정 → 메인 세션이 구현**
- 근거: `SCREEN_QUALITY_AUDIT_2026-05-24.md`, `tokens.ts` 현황, 44개 화면 스캔, `PRD.md / PROJECT_IDENTITY.md` 톤
- 적용 우선순위: 진입 3화면(Welcome/Login/Signup) → 홈 3종 → 출퇴근 → 급여 → 마이페이지 → 매장

> **이 문서 1개만 보고 풀 구현이 가능해야 한다.**
> 모호한 부분은 "현행 유지"가 아니라 "이 문서가 새 진실"이다. 충돌 시 본 문서가 우선.

---

## 목차

1. [현황 인벤토리](#1-현황-인벤토리)
2. [디자인 원칙](#2-디자인-원칙)
3. [컬러 시스템](#3-컬러-시스템)
4. [타이포그래피](#4-타이포그래피)
5. [스페이싱 / 라디우스 / 셰도우 / 모션](#5-스페이싱--라디우스--셰도우--모션)
6. [반응형 시스템](#6-반응형-시스템)
7. [공통 컴포넌트 10종 사양](#7-공통-컴포넌트-10종-사양)
8. [TOP 10 화면 픽셀 사양](#8-top-10-화면-픽셀-사양)
9. [마이그레이션 계획 (Phase A~E)](#9-마이그레이션-계획)
10. [비호환·삭제 권고](#10-비호환--삭제-권고)
11. [구현 체크리스트](#11-구현-체크리스트)

---

## 1. 현황 인벤토리

### 1-1. 화면 카탈로그 (44개 화면 + 28개 컴포넌트)

| 도메인 | 화면 수 | 화면 목록 | 주 사용 토큰 |
|---|---|---|---|
| **welcome** (진입) | 5 | SplashScreen, OnboardingCarouselScreen, WelcomeMainScreen, UsageSelectionScreen, **HybridMainScreen** (dev only — 삭제 대상) | tokens 부분 / COLORS / 하드코딩 혼재 |
| **auth** | 5 | LoginScreen, SignupScreen, PasswordResetScreen, ProfileScreen, KakaoLoginScreen | COLORS 위주 (PasswordResetScreen만 tokens 100%) |
| **home** | 3 | HomeScreen (placeholder — Mock 20개), OwnerDashboardScreen, (직원/개인 홈은 myPage 에 존재) | OwnerDashboard 만 tokens 정렬 |
| **attendance** | 5 | AttendanceScreen, EmployeeAttendanceHome, AttendanceCalendarScreen, AttendanceCorrectionRequestScreen, MissingAttendanceCenterScreen | EmployeeAttendanceHome / Calendar 는 tokens, AttendanceScreen 는 COLORS |
| **salary** | 3 | SalaryListScreen, SalaryDetailScreen, PayrollRunScreen | 거의 토큰 0 / 일부 하드코딩 |
| **myPage** | 4 | EmployeeMyPageRNScreen, ManagerMyPageScreen, MasterMyPageScreen, PersonalUserScreen, AccountSettingsScreen | COLORS 위주, Dimensions 직접 호출 |
| **store** | 5 | StoreDetailScreen, StoreEditScreen, JoinStoreByCodeScreen, EmployeeDetailScreen, WageSettingsScreen, **StoreRegistraionScreen**(오타) | 절반 tokens, 절반 COLORS |
| **info / qna / notification / referral / subscription / timeoff / settings / workplace** | 14 | (각각 1~3개) | 다수가 COLORS / placeholder |

### 1-2. 디자인 시스템 사용률 (Grep 실측)

| 항목 | 파일 수 | 사용 횟수 | 평가 |
|---|---|---|---|
| `tokens.*` 사용 | 31 | **764** | 양호한 기반 — 신규 표준 |
| `COLORS.*` 사용 | 18 | **285** | 마이그레이션 대상 (deprecate) |
| `import .. COLORS` 호출 | 18 | n/a | codemod 1회 처리 가능 |
| 하드코딩 `#RRGGBB` | **72** | **566** | 너무 많음 → ESLint 룰 필요 |
| `Dimensions.get('window')` | 1 (외 17 컴포넌트) | n/a | WelcomeMainScreen 만 dead-code 해소됨. 모듈 레벨 호출 위험 |
| `useWindowDimensions` (RN 권장) | 1 | n/a | 미보급. 표준화 필요 |
| `KeyboardAvoidingView` 적용 | 8 | n/a | **입력 폼 12+ 화면 중 8** — 누락 화면 존재 |
| `SafeAreaView` 적용 | 32 | n/a | 거의 모든 화면 적용. `edges` 미지정 케이스 다수 |

### 1-3. 공통 패턴 — 화면 구조 5종 분류

| 패턴 | 예시 | 문제 |
|---|---|---|
| **A. Gradient 풀스크린** | Welcome, Signup, Login, Splash, Onboarding | 그라디언트 톤 불일치(2색 vs 3색 vs 4색), 카드 마진 누적 |
| **B. SafeArea + ScrollView** | StoreEdit, AttendanceCalendar, PasswordReset, OwnerDashboard | 헤더 패딩 제각각, KeyboardAvoidingView 누락 다수 |
| **C. SafeArea + FlatList** | SalaryList, AttendanceScreen, HomeScreen(placeholder) | 빈/오류/로딩 상태 컴포넌트 부재 |
| **D. 헤더 없는 풀스크린** | EmployeeAttendanceHome, MasterMyPageScreen | 뒤로가기 없음 + 상태바 침범 위험 |
| **E. dev placeholder** | HomeScreen, HybridMainScreen, Settings | 출시 차단 위험 — 정식 화면으로 교체 또는 삭제 |

### 1-4. 직전 진단 + 추가 발견

- **W-04** Welcome 그라디언트는 본 audit 작성 후 사용자가 직접 수정함 (`#FF7A1A → #FF5722` 2색). 같은 톤을 다른 화면(Login/Signup `#2E86AB → #6A5ACD → #A23B72`)이 깨고 있음 → **그라디언트 톤 통일** 필요.
- `Header.tsx` (`common/components/layout/Header.tsx`) 는 5개 nav 버튼을 가로 나열 — 모바일 앱이 아니라 **데스크탑 웹 헤더** 패턴. RN 화면에서 사용 시 너비 부족. **사용 금지** → AppHeader 신규.
- `appHeaderOptions.tsx` 는 `COLORS.SODAM_BLUE` 를 헤더 배경으로 — 브랜드 컬러가 오렌지인데 헤더는 파랑 → **브랜드 정체성 파괴 P0**. 모든 화면 헤더가 파랑이 됨.
- `PrimaryButton.tsx` 는 `COLORS.SODAM_BLUE` (파랑) 를 primary 로 사용 — 브랜드 오렌지와 충돌. 동시에 `form/Button.tsx` 는 오렌지. **두 Primary 버튼 공존**.
- `SectionCard.tsx` 는 `COLORS.WHITE` 하드코딩 + 자체 그림자. `Card.tsx` 는 tokens 사용. **두 카드 공존**.
- `SODAM_GREEN = #A23B72` 는 색명이 거짓 (실제 마젠타). 신규 작업자가 매번 잘못 적용.
- `responsive.tsx` 는 **데스크탑/태블릿 가정** (`576/768/992/1200/1080` 픽셀 폭). RN 모바일에서는 통상 360~430. 브레이크포인트 정의 자체가 잘못. **재정의 필요**.
- `Dimensions.get('window')` 모듈 레벨 호출 — `UsageSelectionScreen.tsx:13`, `PersonalUserScreen.tsx:25` 에서 결과 사용 안 함 (dead code). MasterMyPageScreen.tsx:60 은 width 를 모듈 레벨에서 계산 → 회전·폴드 비대응.
- `useResponsiveStyles` 는 `Header.tsx` 와 일부 demo 컴포넌트에서만 사용. **사실상 죽은 헬퍼**.

---

## 2. 디자인 원칙

### 2-1. 페르소나 & 무드

| 항목 | 결정 |
|---|---|
| 1차 사용자 | 30~50대 한국 1인 사업가 (카페·식당·미용·세탁 등 자영업) |
| 디바이스 | Android(70%) 우선, iOS(30%). 액정 작은 보급형(Galaxy A 시리즈) 포함 |
| 손가락 사용 | 한 손 조작, 카운터 옆에서 빠른 터치 |
| 무드 키워드 | **신뢰감 · 따뜻함 · 명료함**. 화려한 효과 / 다크모드 / 다국어 / 폰트 변경 / 일러스트 과다 — 모두 **NO** |
| 페이스 | 빠른 액션 1개를 1초 내 발견·실행. "오늘 출근 누가 안 했어?" 가 홈 진입 후 2초 안에 답해야 함 |
| 톤 | 친근한 존댓말. `사장님`, `○○님` 호칭. 영문(Confirm/Save) 금지 |

### 2-2. 디자인 원칙 5개

1. **One Primary** — 한 화면에 1차 CTA 는 1개. 오렌지 솔리드는 1개만.
2. **Safe by default** — 모든 화면은 `SafeAreaView edges={['top','bottom']}` + `KeyboardAvoidingView`(입력 시) + `ScrollView` 3종 세트를 `ScreenContainer` 가 자동 처리.
3. **Token only** — Hex/숫자 직접 사용 금지. 모든 색·간격·라디우스는 `tokens.*` 만.
4. **44pt minimum** — 모든 터치 가능 요소(버튼/아이콘/체크박스)는 hitSlop 포함 최소 44×44pt.
5. **Compact-first** — 360pt 폭(Galaxy S22 Mini 등 보급형 폴드) 부터 깨지지 않게 디자인. 480pt+ 는 단순 확대가 아니라 여백 우선.

### 2-3. 절대 금지 (Hard No, 디자인 영역)

- ❌ 신규 컬러 hex 사용 (반드시 토큰 추가 후 사용)
- ❌ `Dimensions.get` 모듈 레벨 호출 (반드시 hook 안 / `useSafeAreaInsets` / `useWindowDimensions`)
- ❌ `position: absolute` 로 하단 고정 (`SafeArea` + flex 흐름 또는 `CtaStack` 사용)
- ❌ 4색 이상 그라디언트, 그라디언트 안에 그라디언트
- ❌ 텍스트에 textShadow + 컨테이너에 elevation+shadow 중첩 (안드로이드 사각 그림자 누출)
- ❌ 이모지를 UI 아이콘으로 사용 (Ionicons / MaterialIcons 만)
- ❌ `fontWeight: 'bold'` 문자열 (반드시 `tokens.typography.weights.bold` = `'700'`)
- ❌ `Dimensions.addEventListener` 직접 호출 (반드시 `useWindowDimensions`)

---

## 3. 컬러 시스템

### 3-1. 토큰 정의 (`tokens.ts` 확장)

기존 `tokens.colors` 는 유지 + 아래 항목 **추가/이름 정리**.

```ts
// theme/tokens.ts — colors 섹션 (v2 최종)
export const colors = {
    // === Brand (단일톤) ===
    brand: {
        primary: '#FF6B35',           // 메인 오렌지 — 1차 CTA, 활성 라디오/체크, 링크
        primaryPressed: '#E5552A',    // pressed state 단색 (이전: brandPrimaryDark)
        primarySoft: '#FFEDE3',       // 배지/탭 배경 (8% tint)
        primaryMuted: '#FFB48F',      // 비활성/디스에이블 정렬
        onPrimary: '#FFFFFF',         // primary 위 텍스트 — 명도 대비 4.5+ 보장
        secondary: '#2A4759',         // 다크 네이비 — 보조 헤더/강조 텍스트
        onSecondary: '#FFFFFF',
        accent: '#F4A261',            // 배지 강조 (잘 안 씀)
    },

    // === Surface ===
    surface: {
        background: '#FFFFFF',        // 메인 배경 (앱 베이스)
        canvas: '#FAFAF9',            // 리스트 배경 (살짝 회색)
        elevated: '#FFFFFF',          // 카드 (그림자 위)
        warm: '#FFFCF7',              // 따뜻한 카드 (CTA 강조용)
        muted: '#F5F5F4',             // 비활성 입력/회색 카드
        inverse: '#1C1917',           // 다크 시트
    },

    // === Text ===
    text: {
        primary: '#1C1917',           // 본문 (16pt+)
        secondary: '#57534E',         // 보조 (라벨, 설명)
        tertiary: '#A8A29E',          // placeholder, 메타 (시간, 카운트)
        disabled: '#D6D3D1',
        inverse: '#FFFFFF',           // 다크 배경 위 흰 텍스트
        brand: '#FF6B35',             // 링크/강조 텍스트
        link: '#FF6B35',              // 명시적 alias (a 태그 톤)
    },

    // === Border / Divider ===
    border: {
        default: '#E7E5E4',           // 입력/카드 보더
        strong: '#D6D3D1',            // 강조 보더 (활성 X)
        divider: '#F1EFEC',           // 리스트 행 구분선 (1px hairline)
        focus: '#FF6B35',             // 포커스 보더 = brand
    },

    // === Semantic Status ===
    status: {
        success: '#10B981',
        successBg: '#D1FAE5',
        warning: '#F59E0B',
        warningBg: '#FEF3C7',
        error: '#EF4444',
        errorBg: '#FEE2E2',
        info: '#3B82F6',
        infoBg: '#DBEAFE',
    },

    // === Domain (status badge) ===
    domain: {
        attendanceWorking: '#10B981',    // 근무 중 (= success)
        attendanceOff:     '#A8A29E',    // 비근무 (= tertiary)
        attendanceLate:    '#F59E0B',    // 지각 (= warning)
        attendanceMissing: '#EF4444',    // 누락 (= error)
        payrollPaid:       '#10B981',
        payrollPending:    '#F59E0B',
        payrollCancelled:  '#EF4444',
    },

    // === Translucent ===
    overlay: {
        scrim: 'rgba(28, 25, 23, 0.55)',  // 모달 backdrop
        light: 'rgba(255, 255, 255, 0.85)',
        dark:  'rgba(28, 25, 23, 0.12)',  // 미묘한 separator
    },

    // === Shadow color ===
    shadow: '#1C1917',

    // ====== Legacy aliases (점진 제거용 — Phase A 동안만 유지) ======
    /** @deprecated use brand.primary */
    brandPrimary: '#FF6B35',
    /** @deprecated use brand.primaryPressed */
    brandPrimaryDark: '#E5552A',
    /** @deprecated use brand.primaryMuted */
    brandPrimaryLight: '#FF8A5C',
    /** @deprecated use brand.secondary */
    brandSecondary: '#2A4759',
    /** @deprecated use text.brand */
    textBrand: '#FF6B35',
    /** @deprecated use surface.background */
    background: '#FFFFFF',
    /** @deprecated use surface.warm */
    surface: '#FFFCF7',
    /** @deprecated use surface.muted */
    surfaceMuted: '#F5F5F4',
    // ... (Phase A codemod 종료 후 일괄 삭제)
} as const;
```

### 3-2. 디자인 룰

| 룰 | 적용 |
|---|---|
| **단일 Primary** | `brand.primary` 만 솔리드 1차 CTA. `secondary` 는 헤더/강조 텍스트 한정. |
| **그라디언트** | 화면 배경 그라디언트는 **`gradient.brandHero` (2색)** 만 허용. 카드/버튼에 그라디언트 X. |
| **시맨틱 분리** | 빨강은 `status.error` 전용. 파랑은 `status.info` 전용. 보조 브랜드 컬러로 파랑 사용 금지. |
| **명도 대비** | 본문 16pt 이상 4.5:1, 14pt 이하 7:1 보장. 회색 카드 위 회색 텍스트(`text.tertiary` 14pt) 금지. |

### 3-3. 그라디언트 토큰 (v2)

```ts
export const gradient = {
    /** 메인 진입 그라디언트 — Splash, Welcome, Onboarding 배경에만 사용 */
    brandHero: ['#FF7A1A', '#FF5722'] as const,
    /** 미묘한 따뜻함 — 카드/배너 (텍스트 가독성 위해 약하게) */
    surfaceWarm: ['#FFFCF7', '#FFF5EC'] as const,
    /** CTA 버튼 (선택) — primary 보다 강조하고 싶을 때 */
    ctaStrong: ['#FF7A1A', '#E5552A'] as const,
    /** @deprecated success / warning 그라디언트 — solid 권장 */
    success: ['#34D399', '#10B981'] as const,
    warning: ['#FBBF24', '#F59E0B'] as const,
} as const;
```

**그라디언트 사용 화면 화이트리스트** (그 외는 solid 만):
- SplashScreen, OnboardingCarouselScreen, WelcomeMainScreen, LoginScreen 배경, SignupScreen 배경.
- **금지**: Home, MyPage, Settings, Salary, Attendance, Store 화면 배경 — solid `surface.canvas` 사용.

### 3-4. 레거시 `COLORS` (logo/Colors.ts) → v2 매핑

> Phase A codemod 가 일괄 치환할 매핑. 사람이 손으로 바꿀 때도 동일하게.

| 레거시 토큰 | 실제 hex | v2 토큰 | 비고 |
|---|---|---|---|
| `COLORS.SODAM_ORANGE` | #FF6B35 | `tokens.colors.brand.primary` | 1:1 |
| `COLORS.SODAM_BLUE` | #2E86AB | `tokens.colors.brand.secondary` | 톤 변경됨 (#2A4759). 정 안 맞으면 `status.info` 사용. **헤더 배경으로 쓰던 곳은 brand.primary 로 변경** |
| `COLORS.SODAM_GREEN` | #A23B72 | (삭제) | 색명 오류 — 마젠타였음. **삭제 후 사용처별 의도 재정의** (대부분 `brand.primary` 또는 `status.error` 로 의도). SignupScreen `employee` 카드는 → `brand.primarySoft` 배경 + `brand.primary` 보더 |
| `COLORS.GRADIENT_PRIMARY` | [#FF6B35, #2E86AB] | `tokens.gradient.brandHero` | 2색이지만 톤 변경 (오렌지 톤 유지) |
| `COLORS.GRADIENT_SECONDARY` | [#2E86AB, #A23B72] | (삭제) | 사용처 없음 / 삭제 |
| `COLORS.WHITE` | #FFFFFF | `tokens.colors.surface.background` (배경) or `tokens.colors.text.inverse` (텍스트) | 의미에 따라 선택 |
| `COLORS.BLACK` | #000000 | `tokens.colors.text.primary` (#1C1917) | 순흑 사용 금지 |
| `COLORS.GRAY_50` | #F9FAFB | `tokens.colors.surface.canvas` | |
| `COLORS.GRAY_100` | #F3F4F6 | `tokens.colors.surface.muted` | |
| `COLORS.GRAY_200` | #E5E7EB | `tokens.colors.border.default` | |
| `COLORS.GRAY_300` | #D1D5DB | `tokens.colors.border.strong` | |
| `COLORS.GRAY_400` | #9CA3AF | `tokens.colors.text.tertiary` | placeholder 톤 |
| `COLORS.GRAY_500` | #6B7280 | `tokens.colors.text.tertiary` | |
| `COLORS.GRAY_600` | #4B5563 | `tokens.colors.text.secondary` | |
| `COLORS.GRAY_700` | #374151 | `tokens.colors.text.secondary` | |
| `COLORS.GRAY_800` | #1F2937 | `tokens.colors.text.primary` | |
| `COLORS.GRAY_900` | #111827 | `tokens.colors.text.primary` | |
| `COLORS.SUCCESS` | #10B981 | `tokens.colors.status.success` | 1:1 |
| `COLORS.WARNING` | #F59E0B | `tokens.colors.status.warning` | 1:1 |
| `COLORS.ERROR` | #EF4444 | `tokens.colors.status.error` | 1:1 |
| `COLORS.INFO` | #3B82F6 | `tokens.colors.status.info` | 1:1 |

### 3-5. ESLint 룰 (선택 적용 — Phase A 종료 후)

```js
// .eslintrc.js — no-restricted-syntax
{
  selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
  message: "Hex 색상 직접 사용 금지. tokens.colors.* 를 사용하세요."
}
```

---

## 4. 타이포그래피

### 4-1. 시스템 폰트 (변경 없음)

- iOS: SF Pro
- Android: Roboto
- 커스텀 폰트 번들 X (앱 크기 ↓, 부팅 시간 ↓, Pretendard 권유는 Phase 3+ 검토)

### 4-2. 타이포 스케일 (v2)

> 기존 `typography.sizes` 의 숫자 토큰(xs/sm/md/lg/xl/xxl/display)은 유지 + **시맨틱 스타일 객체** 신설.
> 작성자는 `tokens.typography.styles.headingLg` 처럼 한 줄로 사용.

| 토큰 | 크기 | lineHeight | weight | letterSpacing | 용도 |
|---|---|---|---|---|---|
| `display` | 32 | 38 (1.19) | 700 | -0.5 | 스플래시 "소담" 브랜드명 |
| `headingLg` | 26 | 34 (1.31) | 700 | -0.4 | 화면 메인 타이틀 (Welcome, 결과 카드) |
| `headingMd` | 22 | 30 (1.36) | 700 | -0.3 | 섹션 타이틀, 모달 헤더 |
| `headingSm` | 18 | 26 (1.44) | 700 | -0.2 | 카드 타이틀, 폼 섹션 |
| `titleLg` | 17 | 24 (1.41) | 600 | -0.2 | 리스트 아이템 타이틀 |
| `titleMd` | 15 | 22 (1.47) | 600 | -0.1 | 작은 리스트 아이템 |
| `titleSm` | 13 | 18 (1.38) | 600 | 0 | 배지, 작은 라벨 |
| `bodyLg` | 17 | 26 (1.53) | 400 | 0 | **본문 기본 — 노안 대응** |
| `bodyMd` | 15 | 23 (1.53) | 400 | 0 | 보조 본문 |
| `bodySm` | 13 | 20 (1.54) | 400 | 0 | 캡션 본문 |
| `label` | 14 | 20 (1.43) | 500 | 0 | 폼 라벨, 버튼 텍스트 sm |
| `caption` | 12 | 16 (1.33) | 400 | 0 | 메타 (시각, 카운트, 도움말) |
| `numericLg` | 28 | 34 (1.21) | 700 | -0.3 | 금액 강조 (`tabular-nums` 권장) |
| `numericMd` | 20 | 26 (1.30) | 700 | -0.2 | 카드 내 숫자 |

```ts
// theme/tokens.ts — typography.styles 신규
export const typography = {
    ...existing,
    /** 시맨틱 스타일 — Text 컴포넌트에 spread 해서 사용 */
    styles: {
        display:    { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
        headingLg:  { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
        headingMd:  { fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
        headingSm:  { fontSize: 18, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
        titleLg:    { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
        titleMd:    { fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: -0.1 },
        titleSm:    { fontSize: 13, lineHeight: 18, fontWeight: '600' },
        bodyLg:     { fontSize: 17, lineHeight: 26, fontWeight: '400' },
        bodyMd:     { fontSize: 15, lineHeight: 23, fontWeight: '400' },
        bodySm:     { fontSize: 13, lineHeight: 20, fontWeight: '400' },
        label:      { fontSize: 14, lineHeight: 20, fontWeight: '500' },
        caption:    { fontSize: 12, lineHeight: 16, fontWeight: '400' },
        numericLg:  { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] as const },
        numericMd:  { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] as const },
    },
} as const;
```

### 4-3. 룰

- 본문 최소 15pt, **권장 17pt (bodyLg)** — 50대 노안 대응.
- `lineHeight` 는 한국어 가독성 위해 **1.5+** (numericLg/headingLg 제외).
- 한 화면에 사용하는 weight 종류는 **2~3개 이내** (`400 / 600 / 700`).
- `fontWeight: 'bold'` 문자열 사용 금지 — 안드로이드에서 폰트 누락 위험. `'700'` 명시.
- 금액 표시는 `numericLg/Md` + `tabular-nums` — 자릿수 흔들림 방지.

---

## 5. 스페이싱 / 라디우스 / 셰도우 / 모션

### 5-1. 스페이싱 (4pt 그리드 — v2 재정의)

기존 `xs(4)/sm(8)/md(12)/lg(16)/xl(20)/xxl(24)/xxxl(32)/huge(48)` 를 **8pt 시리즈로 단순화**.

| 토큰 | px | 용도 |
|---|---|---|
| `none` | 0 | 명시적 제로 |
| `xs` | 4 | 아이콘 라벨 간격, 작은 갭 |
| `sm` | 8 | 인풋 내부 텍스트-아이콘 갭, 카드 내 작은 갭 |
| `md` | 12 | 카드 안 본문 행간, 버튼 내부 좌우 |
| `lg` | 16 | **기본 화면 좌우 여백, 카드 패딩, 행간** |
| `xl` | 24 | 섹션 사이, 카드 - 카드 사이 |
| `2xl` | 32 | 큰 섹션 사이 (Hero - 카드 그룹) |
| `3xl` | 48 | 화면 위쪽 빈 공간 (랜딩) |
| `4xl` | 64 | 매우 큰 빈 공간 (Splash) |

```ts
export const spacing = {
    none: 0,
    xs: 4, sm: 8, md: 12, lg: 16,
    xl: 24, '2xl': 32, '3xl': 48, '4xl': 64,
    // legacy aliases — Phase A 동안 유지
    /** @deprecated use spacing.xl */ xxl: 24,
    /** @deprecated use spacing['2xl'] */ xxxl: 32,
    /** @deprecated use spacing['3xl'] */ huge: 48,
} as const;
```

**적용 룰**:
- 화면 좌우 여백 = `spacing.lg` (16pt) — 컴팩트(<360) 에서 `spacing.md` (12) 로 자동 축소
- 카드 내부 패딩 = `spacing.lg`
- 카드 - 카드 수직 간격 = `spacing.md` 또는 `spacing.lg`
- 섹션(헤더 - 컨텐츠) 수직 간격 = `spacing.xl`
- 버튼 풀폭 좌우 마진은 화면 여백과 동일하게 — 카드 안에서는 카드 좌우 패딩만큼만

### 5-2. 라디우스 (v2)

| 토큰 | px | 용도 |
|---|---|---|
| `none` | 0 | |
| `sm` | 6 | 체크박스, 작은 배지 |
| `md` | 10 | 입력 필드, 작은 버튼 |
| `lg` | 14 | **기본 카드, 큰 버튼, 모달** |
| `xl` | 20 | Hero 카드, 시트 상단 |
| `2xl` | 28 | 모달 상단 핸들 시트 |
| `pill` | 999 | 라디오, 둥근 배지, 칩 |

> 기존 `sm(4)/md(8)/lg(12)/xl(16)` 에서 +2pt 씩 올림 — 따뜻한 인상.
> legacy 토큰은 alias 유지.

### 5-3. 셰도우 (Android elevation 매핑)

| 토큰 | iOS shadow | Android elevation | 용도 |
|---|---|---|---|
| `none` | 없음 | 0 | |
| `xs` | offset(0,1) opacity 0.04 radius 2 | 1 | 입력 포커스 |
| `sm` | offset(0,2) opacity 0.06 radius 4 | 2 | 카드 기본 |
| `md` | offset(0,4) opacity 0.08 radius 10 | 4 | 떠 있는 카드, 액션 시트 |
| `lg` | offset(0,8) opacity 0.12 radius 20 | 8 | 모달, 하단 시트 |
| `brand` | offset(0,8) opacity 0.28 radius 16 (color: brand.primary) | 8 | Primary CTA 강조 |

**안드로이드 사각 그림자 누출 방지**:
- 그림자 적용 시 `overflow: 'hidden'` 금지 (그림자 잘림).
- 둥근 라디우스 컴포넌트는 `borderRadius` 를 그림자 컴포넌트와 같은 View 에 적용.
- 흰 배경 위 흰 카드는 그림자 대신 `border: 1px tokens.colors.border.divider` 사용.

### 5-4. 모션

| 토큰 | duration | easing | 용도 |
|---|---|---|---|
| `fast` | 120ms | ease-out | press feedback, 토글 |
| `normal` | 220ms | ease-in-out | 모달 등장, 화면 전환 보조 |
| `slow` | 360ms | ease-in-out | 페이지 슬라이드, 큰 시트 |
| `splash` | 600ms | ease-out (spring tension 80) | 스플래시 로고 |

```ts
export const motion = {
    duration: { fast: 120, normal: 220, slow: 360, splash: 600 },
    easing: {
        // RN 에서는 Easing 모듈 또는 Reanimated 사용 — 문자열 가이드
        out: 'ease-out',
        inOut: 'ease-in-out',
        spring: { friction: 6, tension: 80 },
    },
} as const;
```

**적용 룰**:
- 누름 피드백은 `transform: scale(0.97)` + duration:`fast`. Opacity 만 변경은 약함.
- 화면 진입은 RN 기본 슬라이드 사용 (Stack 기본). 커스텀 트랜지션 X.
- 페이드인 카드 등장은 마지막 수단 (성능 우선).

---

## 6. 반응형 시스템

### 6-1. 브레이크포인트 (모바일 RN 기준 — v2)

```ts
export const breakpoint = {
    compact:  0,    // 0 ~ 359   (iPhone SE, 보급형 Android)
    regular: 360,   // 360 ~ 479 (대부분 — Pixel, Galaxy S/A)
    wide:    480,   // 480 ~ 599 (대형 폰, 폴드 외부)
    xwide:   600,   // 600+      (폴드 펼침, 태블릿 — Phase 2+)
} as const;
```

**현재 `responsive.tsx` 의 576/768/992 등 데스크탑 브레이크포인트는 폐기.**

### 6-2. 표준 hook `useLayout` 신규

```ts
// theme/useLayout.ts (신규)
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Breakpoint = 'compact' | 'regular' | 'wide' | 'xwide';

export function useLayout() {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const breakpoint: Breakpoint =
        width >= 600 ? 'xwide' :
        width >= 480 ? 'wide'  :
        width >= 360 ? 'regular' : 'compact';

    const isCompact = breakpoint === 'compact';
    const isShortHeight = height < 700; // SE 등 짧은 기기

    return {
        width, height, insets,
        breakpoint,
        isCompact, isShortHeight,
        // 자주 쓰는 동적 값
        screenPaddingH: isCompact ? 12 : 16,
        cardPadding: isCompact ? 16 : 20,
        heroLogoSize: isShortHeight ? 88 : isCompact ? 96 : 120,
    };
}
```

### 6-3. 자동 축소 규칙 (compact <360)

| 요소 | regular+ | compact |
|---|---|---|
| 화면 좌우 여백 | 16 | 12 |
| 카드 패딩 | 20 | 16 |
| Hero 폰트 (display) | 32 | 28 |
| Heading Lg | 26 | 24 |
| 버튼 minHeight (lg) | 56 | 52 |
| 로고 size (Welcome) | 120 | 96 |
| ListItem leading 아이콘 | 40 | 36 |

### 6-4. SafeArea 룰

- **모든 화면**: `<SafeAreaView edges={['top','bottom']}>` 사용. `edges` 명시 필수 (default 4방향은 좌우 잘림 발생).
- 그라디언트 풀스크린 화면: `<LinearGradient>` 가 가장 바깥, `<SafeAreaView edges={['top']}>` 안에서 컨텐츠. bottom 은 `insets.bottom + spacing.lg` 로 명시.
- 헤더 있는 화면: `edges={['top']}` (헤더가 statusbar 처리).
- 모달/시트: `edges={['bottom']}` 만.
- `StatusBar` translucent 환경: `paddingTop = insets.top` 직접 적용 금지 — SafeAreaView 가 처리.

### 6-5. KeyboardAvoidingView 룰

```tsx
<KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    style={{ flex: 1 }}
>
    <ScrollView keyboardShouldPersistTaps="handled">
        {/* ... */}
    </ScrollView>
</KeyboardAvoidingView>
```

- **입력 필드(`TextInput`) 1개 이상인 모든 화면 적용 필수**. 누락 화면: SignupScreen(이미 적용됨), AccountSettingsScreen, WageSettingsScreen, JoinStoreByCodeScreen, AttendanceCorrectionRequestScreen, TimeOffRequestScreen. → `ScreenContainer` 가 `kbAvoid` prop 으로 처리.

---

## 7. 공통 컴포넌트 10종 사양

### 7-0. 폴더 구조 (재정의)

```
frontend/src/common/components/
├── layout/
│   ├── ScreenContainer.tsx    (신규)
│   └── AppHeader.tsx          (신규 — 기존 Header.tsx 는 deprecate)
├── form/
│   ├── AppButton.tsx          (Button.tsx 를 AppButton 으로 rename + props 확장)
│   ├── AppInput.tsx           (Input.tsx 확장)
│   ├── AppCheckbox.tsx
│   ├── AppRadioGroup.tsx
│   └── AppCheckboxList.tsx
├── data-display/
│   ├── AppCard.tsx            (Card.tsx 를 AppCard 로 통일)
│   ├── AppListItem.tsx        (신규)
│   └── AppBadge.tsx           (Badge.tsx 정리)
├── feedback/
│   ├── EmptyState.tsx         (신규)
│   ├── ErrorState.tsx         (신규)
│   ├── LoadingState.tsx       (신규)
│   ├── AppBottomSheet.tsx     (신규)
│   └── AppToast.tsx           (Toast.tsx 정리)
└── overlay/
    └── CtaStack.tsx           (신규 — 하단 고정 CTA 패턴)
```

레거시 컴포넌트 (`PrimaryButton.tsx`, `SectionCard.tsx`, `SectionHeader.tsx`, `Header.tsx`) 는 Phase B 종료 후 삭제.

---

### 7-1. `ScreenContainer`

**책임**: SafeArea + (선택) KeyboardAvoidingView + (선택) ScrollView + 배경 처리를 한 번에.

```tsx
interface ScreenContainerProps {
  children: React.ReactNode;
  /** 'plain' = surface.canvas, 'surface' = surface.background, 'gradient' = brandHero */
  background?: 'plain' | 'surface' | 'gradient';
  /** ScrollView 로 감쌀지 — 기본 true */
  scroll?: boolean;
  /** 입력 폼 화면이면 true (기본 false). KeyboardAvoidingView 자동 적용 */
  kbAvoid?: boolean;
  /** SafeArea edges. 기본 ['top','bottom'] */
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  /** 좌우 패딩 적용 여부 (기본 true). 풀폭 컨텐츠는 false */
  paddingH?: boolean;
  /** 하단 CTA 가 있을 때 콘텐츠 하단 여백 추가 (기본 0) */
  bottomCtaHeight?: number;
  /** ScrollView 콘텐츠 스타일 추가 */
  contentContainerStyle?: ViewStyle;
  /** Status bar 텍스트 색 (gradient = 'light', plain = 'dark') */
  statusBar?: 'light' | 'dark' | 'auto';
  testID?: string;
}
```

**Anatomy**:
```
SafeAreaView (edges)
  └─ LinearGradient (background==='gradient' 일 때)
     └─ KeyboardAvoidingView (kbAvoid 시)
        └─ ScrollView (scroll 시) | View
           └─ children (paddingHorizontal=spacing.lg 자동)
```

**룰**:
- **모든 신규 화면은 이 컴포넌트 1개로 시작**. `<SafeAreaView>` 직접 사용 금지.
- `background='gradient'` 시 자동으로 `statusBar='light'` + brandHero 그라디언트.
- ScrollView 의 `contentContainerStyle.paddingBottom` = `insets.bottom + spacing.lg + bottomCtaHeight` 자동 계산.
- 컴팩트 기기에서 `paddingH=true` 시 자동 `spacing.md` (12) 적용.

**사용 예**:
```tsx
<ScreenContainer background="plain" kbAvoid bottomCtaHeight={80}>
  <Text style={tokens.typography.styles.headingLg}>회원가입</Text>
  {/* ... */}
</ScreenContainer>
<CtaStack>
  <AppButton title="가입하기" onPress={...} variant="primary" size="lg" fullWidth />
</CtaStack>
```

---

### 7-2. `AppHeader`

**책임**: 화면 상단 헤더 — 뒤로가기/메뉴 + 타이틀 + 우측 액션.

```tsx
interface AppHeaderProps {
  title?: string;
  /** 'back' | 'close' | 'menu' | null. 기본 'back' */
  left?: 'back' | 'close' | 'menu' | null;
  /** 좌측 커스텀 노드 */
  leftSlot?: React.ReactNode;
  /** 우측 액션 (최대 2개) — 아이콘 또는 텍스트 */
  rightActions?: Array<{
    icon?: string;        // Ionicons 이름
    label?: string;       // 텍스트 액션 (icon 없을 때)
    onPress: () => void;
    accessibilityLabel?: string;
  }>;
  /** 'compact' = h:48, 'regular' = h:56 (기본), 'large' = h:64 */
  variant?: 'compact' | 'regular' | 'large';
  /** 배경 — 'surface'(흰), 'transparent'(그라디언트 위) */
  background?: 'surface' | 'transparent';
  /** 하단 hairline divider (기본 true, transparent 시 false) */
  divider?: boolean;
  onPressLeft?: () => void;
  testID?: string;
}
```

**Anatomy**:
```
[ ◀ 뒤로 ]   [ 화면 타이틀 ]   [ icon ][ icon ]
   48        flex: 1            48      48
```

- 타이틀은 가운데 정렬, 좌우 액션 영역은 48pt 고정 (좌우 대칭 위해 빈 자리도 48pt 확보).
- 타이틀 폰트 = `titleLg`, color = `text.primary`.
- 'back' 아이콘 = Ionicons `chevron-back`, 24px, color = `text.primary`.
- 'transparent' 배경 시 텍스트/아이콘 = `text.inverse`.

**룰**:
- 모든 화면 헤더는 이걸로 통일. `appHeaderOptions.tsx` 의 `SodamHeaderTitle` 도 이것을 wrap 하도록 변경.
- 헤더 배경은 **반드시 `surface.background` (흰)** — 기존 `SODAM_BLUE` 파랑 헤더 폐기.
- React Navigation `screenOptions.header` 에 이 컴포넌트 등록 → 화면별 중복 정의 X.

---

### 7-3. `AppButton`

기존 `form/Button.tsx` 를 v2 props 로 확장. 코드 자체는 거의 호환되므로 rename + minor 변경.

```tsx
interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** 'low' = 그림자 없음, 'medium' = sm shadow, 'high' = brand shadow (기본: primary='high', 그 외='low') */
  elevation?: 'low' | 'medium' | 'high';
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}
```

**Variants**:

| variant | 배경 | 텍스트 | 보더 | 그림자 |
|---|---|---|---|---|
| `primary` | `brand.primary` | `brand.onPrimary` | none | `brand` (high) |
| `secondary` | `brand.secondary` | `brand.onSecondary` | none | sm |
| `outline` | transparent | `brand.primary` | 1.5px `brand.primary` | none |
| `ghost` | transparent | `brand.primary` | none | none |
| `destructive` | `status.error` | white | none | sm |
| `(disabled)` | `surface.muted` | `text.disabled` | `border.default` | none |

**Sizes**:

| size | minHeight | paddingH | fontSize | radius |
|---|---|---|---|---|
| `sm` | 36 | `spacing.lg` (16) | 14 (label) | `radius.md` |
| `md` | 48 | `spacing.xl` (24) | 15 (titleMd) | `radius.lg` |
| `lg` | 56 (compact:52) | `spacing.2xl` (32) | 17 (titleLg) | `radius.lg` |

**States**:
- default
- pressed: `transform: scale(0.97)` (모든 variant 공통)
- loading: ActivityIndicator (텍스트 자리)
- disabled: opacity 그대로 두지 말고 surface.muted 로 변경

**룰**:
- **한 화면당 `primary` 1개**. 2차 액션은 `outline` 또는 `ghost`.
- `PrimaryButton.tsx` 는 deprecate → AppButton variant='primary' 로 codemod.
- 카드 footer 내부 액션은 `ghost size='sm'` 권장.

---

### 7-4. `AppInput`

기존 `form/Input.tsx` 를 확장.

```tsx
interface AppInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  /** required 표시 (라벨에 빨간 별표) */
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  /** 글자 수 카운터 표시 (maxLength 있을 때) */
  counter?: boolean;
  leftIcon?: React.ReactNode;
  /** 우측 액션 — 비밀번호 토글 / clear / 사용자 정의 */
  rightAction?: { type: 'password' | 'clear' | 'custom'; node?: React.ReactNode; onPress?: () => void };
  secureTextEntry?: boolean;  // password 자동 토글 활성화
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  maxLength?: number;
  multiline?: boolean;
  editable?: boolean;
  testID?: string;
  // 기타 TextInputProps 일부 forward
}
```

**Anatomy**:
```
[ Label * ]                            (label + required *)
┌─────────────────────────────────────┐
│ [icon] placeholder        [action] │  (44pt minHeight)
└─────────────────────────────────────┘
 [ helper / error ]            [ 12/30 ]  (counter)
```

**States**:
- default: border `border.default` 1.5px, bg `surface.background`
- focus: border `border.focus`(brand), bg `surface.background`, ring 효과 없음 (RN 한계 — 보더 색만)
- error: border `status.error`, helperText → errorText (빨강)
- disabled: bg `surface.muted`, text `text.disabled`
- readonly: bg `surface.canvas`, border none

**룰**:
- `placeholderTextColor` 는 반드시 `text.tertiary`.
- secureTextEntry + rightAction `password` 자동 결합 (이중 설정 안 함).
- 라벨은 항상 위에, placeholder 안에 라벨 넣기(float label) **금지** — 한국어 가독성 약함.
- error 시 화면이 흔들리지 않도록 `errorText` 자리 = `minHeight: 16` 미리 잡기.

---

### 7-5. `AppCard`

기존 `data-display/Card.tsx` 를 확장.

```tsx
interface AppCardProps {
  children: React.ReactNode;
  /** 'elevated' = 그림자 sm, 'outlined' = 보더만, 'filled' = surface.warm, 'flat' = 배경만 */
  variant?: 'elevated' | 'outlined' | 'filled' | 'flat';
  /** 누름 가능 카드 */
  onPress?: () => void;
  /** 헤더 슬롯 — title/subtitle 또는 커스텀 노드 */
  header?: { title?: string; subtitle?: string; right?: React.ReactNode } | React.ReactNode;
  /** 카드 하단 액션 영역 */
  footer?: React.ReactNode;
  /** padding 크기 (기본 'lg' = 20pt) */
  padding?: 'none' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  testID?: string;
}
```

**Variants**:
| variant | bg | border | shadow |
|---|---|---|---|
| `elevated` | `surface.elevated` (white) | none | `sm` |
| `outlined` | `surface.background` | 1px `border.divider` | none |
| `filled` | `surface.warm` | none | none |
| `flat` | `surface.background` | none | none |

**룰**:
- 라디우스는 항상 `radius.lg` (14pt).
- 누름 시 scale 0.99 (1보다 약간 작게).
- 흰 화면 위 흰 카드는 `elevated` 사용. 그라디언트 위 카드는 `flat` 또는 `elevated`.
- `SectionCard.tsx` 는 `AppCard variant='elevated'` 로 codemod.

---

### 7-6. `AppListItem`

```tsx
interface AppListItemProps {
  /** 좌측 — 아이콘/아바타/이미지 */
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** 우측 — 텍스트/배지/스위치/체크박스 */
  trailing?: React.ReactNode;
  /** 우측 화살표 표시 */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** 행간 — 'comfortable' (기본, 56pt) | 'compact' (44pt) */
  density?: 'comfortable' | 'compact';
  /** 하단 hairline (마지막 행은 false) */
  divider?: boolean;
  testID?: string;
}
```

**Anatomy**:
```
┌──────────────────────────────────────────────────┐
│ [leading]  Title                  [trailing]  ›  │  (16pt 패딩)
│            Subtitle                              │
└──────────────────────────────────────────────────┘
─────────────────────────── (divider)
```

- title: `titleMd` (15 / 600)
- subtitle: `caption` (12 / 400) — `text.tertiary`
- minHeight: 56 (comfortable) / 44 (compact)
- leading 크기: 40×40 (comfortable) / 32×32 (compact) — 컴팩트 기기 36
- divider: `hairlineWidth` `border.divider`, leading 끝부터 오른쪽 끝까지

**룰**:
- 모든 설정 / MyPage / NotificationCenter 의 행은 이것으로 통일.

---

### 7-7. `AppRadioGroup` / `AppCheckboxList`

```tsx
interface RadioOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AppRadioGroupProps<T> {
  value: T | null;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  /** 'list' = 세로 카드 / 'inline' = 가로 칩 */
  variant?: 'list' | 'inline';
  testID?: string;
}
```

**list variant Anatomy** (Signup 의 사용자 유형 카드용):
```
┌──────────────────────────────────────────────────┐
│ (◉)  [icon]  타이틀                              │
│              부가 설명 텍스트                    │
└──────────────────────────────────────────────────┘
```

- 선택 시: 보더 `brand.primary` 1.5px + 배경 `brand.primarySoft` + 라디오 채움 `brand.primary`
- 비선택: 보더 `border.default` + 배경 `surface.canvas` + 라디오 빈 동그라미
- 라디오는 좌측 24×24 동그라미 + 내부 12×12 채움.
- **카드별 색을 다르게 쓰지 말 것** (현행 SignupScreen 문제). 항상 brand.primary 단색.

`AppCheckboxList` 는 동일 패턴, 다중 선택 + 체크 아이콘.

---

### 7-8. `EmptyState` / `ErrorState` / `LoadingState`

3종 일관 처리.

```tsx
interface EmptyStateProps {
  /** Ionicons 이름 또는 ReactNode */
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  /** CTA — 1개만 */
  action?: { label: string; onPress: () => void; variant?: 'primary' | 'outline' };
  /** 화면 전체 중앙 (기본) 또는 inline (카드 안) */
  layout?: 'full' | 'inline';
  testID?: string;
}

interface ErrorStateProps extends Omit<EmptyStateProps, 'icon'> {
  /** 'network' | 'permission' | 'notFound' | 'server' | 'unknown' */
  variant?: 'network' | 'permission' | 'notFound' | 'server' | 'unknown';
  onRetry?: () => void;
}

interface LoadingStateProps {
  message?: string;
  /** 'full' = 화면 가운데 / 'inline' = 카드 안 / 'overlay' = 반투명 덮개 */
  layout?: 'full' | 'inline' | 'overlay';
}
```

**Anatomy (EmptyState full)**:
```
       [ icon 56×56, text.tertiary ]
           Title (titleLg, primary)
       Description (bodyMd, secondary)
                  ↕ 24
           [ CTA Button ]
```

**룰**:
- 이모지 X — Ionicons 사용.
- ErrorState `variant='network'` → 자동 아이콘 + 권장 메시지 ("인터넷 연결을 확인해 주세요").
- 모든 화면의 빈/오류/로딩 상태는 이 3 컴포넌트만 사용.

---

### 7-9. `AppBottomSheet`

```tsx
interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 'auto' (컨텐츠), 'half' (50%), 'full' (90%) */
  size?: 'auto' | 'half' | 'full';
  /** 닫기 버튼 표시 (기본 true) */
  showClose?: boolean;
  /** 백드롭 탭 시 닫힘 (기본 true) */
  dismissOnBackdrop?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode; // CtaStack 권장
}
```

**Anatomy**:
```
┌─────────────────────────────┐
│         ────                 │  (handle 40×4 radius:2)
│   Title           [×]        │
│ ──────────────────────────   │
│   ScrollView 안 컨텐츠       │
│                              │
│ ──────────────────────────   │
│   Footer (선택 — CtaStack)   │
└─────────────────────────────┘
```

- 상단 라디우스 `radius.xl` (20pt)
- 백드롭: `overlay.scrim`
- iOS 슬라이드 인 220ms, Android 동일
- 시트 안쪽 SafeArea bottom 처리

---

### 7-10. `CtaStack` (하단 고정 CTA)

```tsx
interface CtaStackProps {
  children: React.ReactNode | React.ReactNode[];  // AppButton 1~2개
  /** 상단 hairline divider (기본 true) */
  divider?: boolean;
  /** 배경 — 'surface' (기본) | 'transparent' */
  background?: 'surface' | 'transparent';
  /** SafeArea bottom 자동 적용 (기본 true) */
  safeBottom?: boolean;
}
```

**Anatomy**:
```
─────────────────────────── (divider)
│ paddingH:16 paddingV:12     │
│ ┌─────────────────────────┐ │
│ │     Primary CTA (lg)    │ │  ← 한 화면당 1개
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Secondary CTA (ghost)  │ │  ← 선택
│ └─────────────────────────┘ │
│ [ SafeArea bottom inset ]    │
```

- **`position: 'absolute'` 사용 금지** — 호출자가 `<View style={{flex:1}}>` 안에서 마지막 자식으로 사용. ScreenContainer 가 `bottomCtaHeight` 로 패딩 계산.
- 또는 `ScreenContainer scroll={false}` + `<View style={{flex:1}}>...</View><CtaStack>...</CtaStack>` 패턴.

---

## 8. TOP 10 화면 픽셀 사양

각 화면에 동일한 구조로 기술: **레이아웃 와이어 / 토큰 / 반응형 / UX 결정 / 변화 요약**.

---

### 8-1. WelcomeMainScreen — 첫 인상 1순위

**현행 평가**: 사용자가 직접 수정 후 비교적 양호. 그러나 그라디언트만 통일됐고 typography 토큰화/컴팩트 비율 미정렬.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│ [ Status bar: light-content ]        │
│         (gradient brandHero)         │
│                                      │
│                                      │
│           [ Sodam Logo ]             │  ← size: heroLogoSize (120/96)
│              white variant           │
│                                      │
│              소담                    │  ← display 32 (compact 28), white
│         소상공인을 담다              │  ← titleLg 17, white 95%
│         디지털과 연결하다            │  ← bodyMd 15, white 85%
│                                      │
│                                      │
│         (flex space)                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │     회원가입 (primary, lg)     │  │  ← AppButton primary fullWidth
│  └────────────────────────────────┘  │
│                                      │
│      이미 계정이 있어요 (로그인)     │  ← ghost link 톤, 밑줄
│                                      │
│  [ SafeArea bottom + spacing.lg ]    │
└──────────────────────────────────────┘
```

**토큰**:
- 배경: `gradient.brandHero` (LinearGradient 2색)
- 브랜드명: `typography.styles.display`, `text.inverse`
- 서브타이틀: `typography.styles.titleLg`, `rgba(255,255,255,0.95)` (토큰화: `overlay.light`)
- 회원가입 CTA: `AppButton variant='primary' size='lg' fullWidth` — 단, 흰 배경 위가 아닌 그라디언트 위라 **흰 배경 + brand text** 의 inverse primary 필요 → 새 variant `invertedPrimary` 추가 또는 ScreenContainer 가 자동 처리.
- 로그인 링크: `AppButton variant='ghost'` + `textStyle={{color: white, textDecorationLine:'underline'}}`

**반응형**:
- compact(<360) / shortHeight(<700): 로고 96, display 28, top padding 24
- regular+: 로고 120, display 32, top padding 48
- bottom: `insets.bottom + spacing.lg`

**UX 결정**:
- 회원가입(1차) > 로그인(2차) — 신규 유저가 압도적이라는 가정. 로그인은 텍스트 링크 톤으로 시각 위계 낮춤.
- absolute 제거, `justifyContent: 'space-between'` 으로 자동 분배.

**변화 요약**: 그라디언트는 OK. **타이포 토큰화 + invertedPrimary 버튼 변종 도입**으로 일관성 확보.

---

### 8-2. LoginScreen

**현행 평가**: P0 — 그라디언트 `#2E86AB → #6A5ACD → #A23B72` 가 **브랜드 톤과 무관한 파랑→보라→마젠타**. 카드는 흰색이라 컨텐츠는 양호하나 진입 인상이 분열됨.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader (transparent, left=back)  │  ← 좌측 chevron, 타이틀 없음
│                                      │
│         (gradient brandHero)         │
│                                      │
│         [ Sodam Logo size 56 ]       │  ← white variant
│              로그인                  │  ← headingLg, white
│                                      │
│  ┌────────────────────────────────┐  │  ← AppCard variant='flat' bg white, radius xl, padding xl
│  │  이메일                        │  │  ← AppInput label
│  │  ┌──────────────────────────┐  │  │
│  │  │ name@email.com           │  │  │
│  │  └──────────────────────────┘  │  │
│  │  비밀번호                      │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ ••••••••           [보기]│  │  │
│  │  └──────────────────────────┘  │  │
│  │  ☐ 로그인 상태 유지   비밀번호 찾기  │  ← row, 양끝 정렬
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  로그인 (primary lg)     │  │  │
│  │  └──────────────────────────┘  │  │
│  │                                │  │
│  │  ──── 또는 ────                │  │
│  │  ┌─────────┐ ┌─────────┐      │  │
│  │  │ 구글     │ │ 카카오   │      │  │
│  │  └─────────┘ └─────────┘      │  │
│  │                                │  │
│  │  계정이 없으신가요? 회원가입   │  │  ← bodyMd + brand link
│  └────────────────────────────────┘  │
│                                      │
│  [ SafeArea bottom + spacing.xl ]    │
└──────────────────────────────────────┘
```

**토큰**:
- 배경: `gradient.brandHero` (Welcome 과 동일 — 진입 일관성)
- 카드: `AppCard variant='flat'` 배경 `surface.background`, radius `xl`, padding `xl(24)`
- 카드 내부: `AppInput` 그대로
- "또는" divider: `divider` 좌우 + `caption` `text.tertiary` 가운데
- 소셜 버튼: `AppButton variant='outline' size='md'`
- 회원가입 링크: `text` color `text.secondary`, "회원가입" 부분만 `text.brand` + `weight:600`

**반응형**:
- compact: 카드 padding `lg(16)`, 로고 size 48
- regular+: 카드 padding `xl(24)`, 로고 size 56
- 카드 좌우 margin: `spacing.lg` (16) — 폼 가로 너비 일정

**UX 결정**:
- 카드 안에 모두 들어가는 단일 컬럼 — 사용자가 스크롤 없이 끝까지 보이도록 설계.
- "비밀번호 찾기" 는 우측 정렬, brand 색.
- 소셜 로그인은 outline 으로 시각 위계 낮춤 — 1차는 이메일/비밀번호.

**변화 요약**: 보라/마젠타 그라디언트 폐기 → brandHero 통일. 카드 안에 폼 통합.

---

### 8-3. SignupScreen

**현행 평가**: P0 — 비율 누적(`paddingH:24 + marginH:16=40`), 카드 좁음. P1 — 두 디자인 시스템 혼재. P1 — 사용자 유형 카드 색 충돌.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader (transparent, left=back)  │
│                                      │
│         (gradient brandHero)         │
│                                      │
│         [ Logo 56 ]   회원가입       │  ← headingLg
│         소담과 함께 시작해보세요     │  ← bodyMd, white 80%
│                                      │
│  ┌────────────────────────────────┐  │  ← AppCard variant='flat' radius xl
│  │  기본 정보                     │  │  ← headingSm, left 정렬
│  │                                │  │
│  │  이름 *                        │  │  ← AppInput required
│  │  [ 이름을 입력해 주세요    ]   │  │
│  │                                │  │
│  │  이메일 *                      │  │
│  │  [ name@email.com         ]   │  │
│  │                                │  │
│  │  비밀번호 *                    │  │
│  │  [ 8자 이상         [보기] ]   │  │
│  │  ▓▓▓▓▓▓░░░░ 강도: 보통         │  │  ← 비밀번호 강도 (P1 누락 → 추가)
│  │                                │  │
│  │  ─────────────────             │  │
│  │                                │  │
│  │  사용 목적을 선택해 주세요     │  │  ← headingSm, left
│  │  ┌──────────────────────────┐  │  │
│  │  │ (◯) 🏠 개인 사용자        │  │  │  ← AppRadioGroup
│  │  │     혼자서 간편한 근태   │  │  │
│  │  └──────────────────────────┘  │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ (●) 🏢 매장 대표          │  │  │  ← 선택 시 brand soft bg
│  │  │     직원 근태 관리       │  │  │
│  │  └──────────────────────────┘  │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ (◯) 👥 직원                │  │  │
│  │  │     매장에 참여           │  │  │
│  │  └──────────────────────────┘  │  │
│  │  ─────────────────             │  │
│  │                                │  │
│  │  약관 동의                     │  │  ← ConsentBlock 그대로 (이미 tokens)
│  │  ☑ 전체 동의                   │  │
│  │  ────                          │  │
│  │  ☑ 만 14세 이상 (필수)         │  │
│  │  ☑ 이용약관 동의 (필수) [보기] │  │
│  │  ☑ 개인정보 (필수)      [보기] │  │
│  │  ☐ 마케팅 (선택)        [보기] │  │
│  └────────────────────────────────┘  │
│                                      │
│  [ scroll bottom = 80 (CTA height) ] │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  CtaStack:                           │  ← 화면 하단 고정 (absolute X, flex 흐름)
│  ┌────────────────────────────────┐  │
│  │  가입하기 (primary lg) disabled│  │  ← 필수 미동의 시 비활성
│  └────────────────────────────────┘  │
│      이미 계정이 있으신가요? 로그인  │  ← ghost
│  [ SafeArea bottom ]                 │
└──────────────────────────────────────┘
```

**토큰**: Login 과 동일 + ConsentBlock 은 그대로(이미 tokens 사용).

**반응형**:
- 카드 좌우 margin = `spacing.lg`(16) **단일 소스** — `scrollContent.paddingH=0`, `formCard.marginH=16`. 누적 0.
- 카드 padding compact `lg(16)`, regular+ `xl(24)`.
- 이모지 → Ionicons 변경: 🏠 → `person-outline`, 🏢 → `business-outline`, 👥 → `people-outline`.

**UX 결정 (S-04, S-05 회수)**:
- 사용자 유형 카드의 색 분기 제거 — 항상 단일 brand 색.
- 비밀번호 강도 표시 추가 (zxcvbn 또는 간단 휴리스틱).
- 가입 버튼은 필수 3종 동의 + 모든 필드 입력 전까지 `disabled`.
- CtaStack 사용으로 키보드 위에 자연스럽게 떠 있음.

**변화 요약**: 카드 마진 누적 제거, 사용자 유형 카드 색 통일, 비밀번호 강도 추가, CTA 하단 고정.

---

### 8-4. PasswordResetScreen

**현행 평가**: tokens 100% 사용 — **유일한 모범 사례**. 변경 최소.

**v2 와이어** (현행 + 정리):
```
┌──────────────────────────────────────┐
│  AppHeader (surface, left=back, "비밀번호 재설정") │
│                                      │
│  ScreenContainer (plain, kbAvoid)    │
│                                      │
│  [ ① ──── ② ──── ③ ]                 │  ← Progress (현행 유지 — brand color)
│  이메일  인증   새 비번              │
│                                      │
│  AppCard outlined:                   │
│  Step 1: 이메일                      │
│  ┌──────────────────────────┐        │
│  │ name@email.com           │        │  ← AppInput
│  └──────────────────────────┘        │
│  helper: 가입할 때 사용한 이메일     │
│                                      │
│  [ 인증번호 받기 (primary lg) ]      │  ← CtaStack 안
└──────────────────────────────────────┘
```

**토큰**: 그대로 유지. ProgressBar 토큰화는 이미 됨.

**변화 요약**: AppHeader 도입, Step 카드를 `AppCard variant='outlined'` 로 통일. 거의 변동 없음.

---

### 8-5. 홈 화면 3종 (사장/개인/직원)

소담은 사용자 유형(`MASTER` / `PERSONAL` / `EMPLOYEE`) 별로 진입 후 메인 화면이 다름.
**현행 매핑**:
- MASTER → `MasterMyPageScreen` (사실상 사장 홈 역할) + `OwnerDashboardScreen` (PRD 의도)
- PERSONAL → `PersonalUserScreen`
- EMPLOYEE → `EmployeeMyPageRNScreen` + `EmployeeAttendanceHome`

3개 화면을 **동일한 구조**로 통일:

```
┌──────────────────────────────────────┐
│  AppHeader surface                   │
│  left=menu  타이틀: 안녕하세요 ○○님 │  ← 좌측 햄버거 또는 알림, 우측 알림
│                            [🔔 3]   │
│                                      │
│  ScreenContainer plain scroll        │
│                                      │
│  ┌──────────────────────────────┐    │  ← StoreSelector (사장: 매장 2+)
│  │  ▼ 카페 소담                 │    │     또는 (직원: 매장 1+)
│  └──────────────────────────────┘    │
│                                      │
│  ─── Hero 카드 ──────────────────    │
│  ┌──────────────────────────────┐    │  ← AppCard filled (warm bg)
│  │  오늘 출근 현황               │    │  ← titleLg
│  │  3 / 5                       │    │  ← numericLg
│  │  2명이 아직 출근 안 했어요   │    │  ← bodyMd, text.secondary
│  │       [ 자세히 보기 → ]      │    │  ← ghost button
│  └──────────────────────────────┘    │
│                                      │
│  ─── 이번 달 ──────────────────      │  ← SectionTitle pattern
│  ┌──────────┐  ┌──────────┐          │  ← AppCard elevated × 2 (Grid)
│  │ 누적 급여 │  │ 누적 근무 │          │
│  │ ₩1,234,567│  │  168h    │          │
│  └──────────┘  └──────────┘          │
│                                      │
│  ─── 빠른 액션 ────────────────      │
│  ┌─[ 출근하기 ]─[ 급여 정산 ]─┐      │  ← 가로 스크롤 칩 (직원/사장 다름)
│  └─[ 직원 추가 ]─[ 위치 설정 ]┘      │
│                                      │
│  ─── 알림 / 인사이트 ──────────      │  ← AppListItem 들
│  • 이번 달 야간 근무가 늘었어요      │
│  • 누락 출근 1건 처리 필요           │
│                                      │
│  ─── 노무·세무 소식 ───────────      │  ← Horizontal FlatList
│  [Policy Card][Policy Card]...      │
└──────────────────────────────────────┘
```

**토큰**:
- Hero 카드: `AppCard variant='filled'` (warm bg) → 한 화면 정체성. 큰 숫자 `numericLg`.
- 상단 인사 영역은 헤더 안 — `text.primary` (배경 흰).
- KPI Grid 2열: `flexDirection:'row'`, `gap: spacing.md`, `flex: 1` 카드.
- 빠른 액션 칩: 가로 스크롤, 칩 = `AppButton variant='outline' size='sm'`.

**반응형**:
- compact: KPI 1열로 stack, 칩 더 작게.
- 모든 패딩 = `screenPaddingH` (compact 12, regular 16).

**UX 결정**:
- 사장 홈에서 가장 중요한 정보 = "오늘 누가 출근 안 했어?" → Hero 에 노출.
- 개인 홈 = "이번 주 근무 시간/예상 급여".
- 직원 홈 = "지금 출근/퇴근 상태 + 큰 액션 버튼".

**변화 요약**: `MasterMyPageScreen`, `PersonalUserScreen`, `EmployeeMyPageRNScreen` 의 3종 구조를 **하나의 템플릿**으로 통일. Hero / KPI Grid / Quick Actions / Feed 4섹션.

---

### 8-6. AttendanceScreen (출퇴근 메인 — 사장 시점)

**현행 평가**: 663줄 단일 파일, MainLayout + Card 사용, COLORS import. 거대해서 분해 필요.

**v2 와이어** (사장이 매장 출퇴근 현황 보는 화면):
```
┌──────────────────────────────────────┐
│  AppHeader "출퇴근 현황"             │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  [▼ 카페 소담 ]                      │  ← StoreSelector
│                                      │
│  ─── 오늘 ──────────                 │
│  ┌──────────────────────────────┐    │
│  │  [●] 김영희  09:02 → 근무 중 │    │  ← AppListItem dot=success
│  │  [●] 박철수  08:55 → 18:30   │    │
│  │  [○] 이미영  미출근          │    │  ← dot=tertiary
│  └──────────────────────────────┘    │
│                                      │
│  ─── 출퇴근 방법 ──────              │
│  [표준 출근] [GPS] [NFC]             │  ← AppRadioGroup variant='inline'
│                                      │
│  ─── 한 달 기록 ───                  │
│  [FlatList of AttendanceRecordsList] │
│                                      │
└──────────────────────────────────────┘
[ CtaStack (직원 시점일 때만): 출근하기 (primary lg) ]
```

**토큰**:
- 행 상태 dot: `domain.attendanceWorking / attendanceOff / attendanceLate / attendanceMissing`
- 리스트 행 = `AppListItem density='comfortable' leading={<Dot color={...}/>}`

**반응형**: 리스트는 width 100%, 좌우 패딩만 변동.

**UX 결정**: 사장 시점은 "전체 한눈에", 직원 시점은 EmployeeAttendanceHome (큰 동그라미 버튼) — 별도 화면 유지.

**변화 요약**: 663줄 → 4 컴포넌트 분해 (StoreSelectorSection / TodayList / MethodPicker / HistoryList). COLORS 제거.

---

### 8-7. AttendanceCalendarScreen

**현행 평가**: tokens 사용 양호. 캘린더 그리드 + 선택일 상세 카드. 디자인 자체는 OK.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader "근무 캘린더"             │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  ◀  2026년 5월  ▶                    │  ← header row, 가운데 정렬
│                                      │
│  일 월 화 수 목 금 토                 │
│  ─────────────────────                │
│   1  2  3  4  5  6  7                │  ← 7열 그리드
│   ●  ●  ●  ●  ─  ─  ●                │  ← 출근 dot
│   8  9 10 11 12 13 14                │
│   ⦿  ●  ●  ●  ─  ─  ●               │  ← 오늘 = 큰 동그라미
│  ...                                  │
│                                      │
│  ─── 선택일 (5월 12일 월) ──         │
│  ┌──────────────────────────────┐    │  ← AppCard outlined
│  │  카페 소담                   │    │
│  │  09:02 → 18:30   (8h 28m)    │    │
│  │  적용 시급: ₩10,000          │    │
│  │  [ 정정 요청 (outline) ]     │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**토큰**:
- 일자 셀: 44×44pt (터치 영역), pill radius
- 오늘: `brand.primarySoft` bg + `brand.primary` 보더
- 선택: `brand.primary` bg + `text.inverse`
- 주말: 토 `status.info`, 일 `status.error`
- dot: 6×6, `domain.attendanceWorking`

**반응형**:
- compact: 셀 36×36, 폰트 13. regular+: 44×44, 폰트 15.

**UX 결정**: 현행 거의 유지. 컴팩트에서 그리드 좁아지는 것만 해결.

**변화 요약**: 디자인 토큰 정렬 + 컴팩트 비율 조정.

---

### 8-8. SalaryListScreen / SalaryDetailScreen

**현행 평가**: SalaryDetailScreen 은 토큰 0, 인라인 styles. SalaryListScreen 도 COLORS/MainLayout 사용.

**SalaryListScreen v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader "급여" right=[필터]       │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  ─── 이번 달 ──                      │
│  ┌──────────────────────────────┐    │  ← AppCard filled (Hero KPI)
│  │  예상 지급액                 │    │
│  │  ₩4,567,890                  │    │  ← numericLg
│  │  근무 168h · 직원 5명         │    │
│  │       [ 정산 실행 (primary) ]│    │
│  └──────────────────────────────┘    │
│                                      │
│  ─── 지난 기록 ──                    │
│  [Filter chip row: 매장 / 상태 / 기간]│
│  ┌──────────────────────────────┐    │  ← AppListItem (각 행)
│  │ 김영희  2026-04   ₩1,234,567 │    │     trailing = Badge
│  │ ─────                         │    │
│  │ 박철수  2026-04   ₩980,000   │    │
│  │ ...                          │    │
│  └──────────────────────────────┘    │
│                                      │
│  [EmptyState 시: "아직 정산 내역이 없어요" + "정산 실행"] │
└──────────────────────────────────────┘
```

**SalaryDetailScreen v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader "급여 명세" right=[공유]  │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  ┌──────────────────────────────┐    │  ← Hero
│  │  김영희 · 2026년 4월         │    │
│  │  실수령액                    │    │
│  │  ₩1,234,567                  │    │  ← numericLg
│  │  [ Badge: 지급완료 ]         │    │
│  └──────────────────────────────┘    │
│                                      │
│  ─── 항목 내역 ──                    │
│  ┌──────────────────────────────┐    │  ← AppCard outlined
│  │ 기본급           ₩1,000,000  │    │  ← 행: 좌측 라벨 + 우측 금액
│  │ 주휴수당          ₩192,000   │    │
│  │ 야간가산           ₩45,000   │    │
│  │ ───────────────              │    │
│  │ 총 지급액      ₩1,237,000   │    │  ← 강조 (numericMd)
│  │ 4대보험         -₩100,000   │    │  ← negative = text.secondary
│  │ 소득세           -₩30,000   │    │
│  │ ───────────────              │    │
│  │ 실수령액       ₩1,107,000   │    │  ← brand.primary numericLg
│  └──────────────────────────────┘    │
│                                      │
│  ─── 근무 상세 ──                    │
│  [근무일/시간/적용시급 등]            │
│                                      │
└──────────────────────────────────────┘
[ CtaStack: PDF 내려받기 (outline) | 직원에게 전송 (primary) ]
```

**토큰**:
- 금액 표시는 `numericLg/Md` + tabular-nums.
- 음수 (-₩100,000): `text.secondary` + `weight:500`.
- 실수령액: `brand.primary` + `numericLg` + `weight:700`.

**반응형**: 항목 행은 양끝 정렬, compact 에서 폰트 -1pt.

**UX 결정**: 금액 위계 명확화. 총 지급액과 실수령액의 시각 구분.

**변화 요약**: 인라인 styles 전부 토큰화, Hero + Items + Detail 3섹션 통일, EmptyState 도입.

---

### 8-9. MyPageScreen (개인 사용자 기준)

**현행 평가**: `PersonalUserScreen.tsx` 거대(`1400+ 줄 추정`), Dimensions 모듈 호출. `MasterMyPageScreen`, `EmployeeMyPageRNScreen` 도 비슷.

> 8-5 에서 다룬 사용자 유형별 홈 (Master/Personal/Employee) 과는 **다른** "내 정보 / 설정" 마이페이지. 현행 마이페이지는 홈+설정 혼합.
>
> v2 결정: "마이페이지" 는 **계정 + 설정 + 약관/문의** 만. 홈은 8-5 의 Home 화면이 담당. 현행 PersonalUserScreen 의 출근 기록/통계 부분은 Home 으로 이동.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader "마이페이지"              │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  ┌──────────────────────────────┐    │  ← Profile card (filled)
│  │  [Avatar 64] 김소상           │    │
│  │              c65621@gmail.com │    │
│  │  [ 프로필 수정 (outline sm) ] │    │
│  └──────────────────────────────┘    │
│                                      │
│  ─── 내 매장 ── (사장만)             │
│  [AppListItem 매장 1]                │
│  [AppListItem 매장 2]                │
│  [+ 매장 추가 (outline)]             │
│                                      │
│  ─── 계정 ──                         │
│  [AppListItem] 비밀번호 변경      ›  │
│  [AppListItem] 이메일/휴대폰      ›  │
│  [AppListItem] 알림 설정          ›  │
│                                      │
│  ─── 구독 ──                         │
│  [AppListItem] 현재 플랜: 무료   ›   │
│  [AppListItem] 결제 수단         ›   │
│                                      │
│  ─── 정보 ──                         │
│  [AppListItem] 추천 코드          ›  │
│  [AppListItem] 공지사항           ›  │
│  [AppListItem] 문의하기 (Q&A)     ›  │
│  [AppListItem] 약관·방침          ›  │
│  [AppListItem] 버전 정보 v1.0.0      │
│                                      │
│  ─── 위험 ──                         │
│  [AppListItem destructive] 로그아웃  │
│  [AppListItem destructive] 회원탈퇴  │
│                                      │
└──────────────────────────────────────┘
```

**토큰**:
- Section 사이 `spacing.xl(24)`, 행 사이 hairline.
- Destructive 행: 텍스트 `status.error`, leading 아이콘도 error.
- 모든 행 chevron + 44pt minHeight.

**반응형**: 단순 리스트 — 별도 처리 없음.

**UX 결정**:
- 홈에서 마이페이지로 분리 — 홈은 "오늘/이번달", 마이는 "계정/설정".
- 위험 액션은 가장 아래, 시각 구분.

**변화 요약**: 거대 화면(1400+ 줄) → 단일 리스트로 단순화. Dimensions 모듈 호출 제거.

---

### 8-10. StoreManagementScreen (사장 전용 — 매장 관리 진입점)

> 현행 `StoreEditScreen` 은 1개 매장 편집. 매장 목록/추가/관리 진입점 = `WorkplaceListScreen` 또는 MasterMyPageScreen 내 섹션. v2 에서는 **별도 화면**으로 명시.

**v2 와이어**:
```
┌──────────────────────────────────────┐
│  AppHeader "내 매장"  right=[+]      │
│                                      │
│  ScreenContainer plain               │
│                                      │
│  ─── 운영 중 ──                      │
│  ┌──────────────────────────────┐    │  ← AppCard elevated (각 매장)
│  │  카페 소담                   │    │  ← titleLg
│  │  서울 마포구 ··              │    │  ← bodyMd secondary
│  │                              │    │
│  │  직원 5명 · 오늘 출근 3      │    │  ← caption
│  │                              │    │
│  │  [정보] [급여] [위치]        │    │  ← outline sm 3개 (Quick)
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  레스토랑 소담               │    │
│  │  ...                         │    │
│  └──────────────────────────────┘    │
│                                      │
│  [EmptyState: "첫 매장을 등록해 볼까요?" + "매장 등록 (primary)"] │
│                                      │
│  ─── 매장 코드 ──                    │
│  ┌──────────────────────────────┐    │  ← AppCard outlined (filled bg)
│  │  직원 합류 코드              │    │
│  │  CAFE-1234                   │    │  ← numericLg monospace
│  │  [ 복사 ] [ 공유 ]           │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**토큰**:
- 매장 코드는 monospace (RN `fontFamily: Platform.select({ios:'Menlo', android:'monospace'})`).
- 매장 카드 elevated, 카드 내 Quick action 칩 outline sm.

**UX 결정**:
- 매장 코드를 항상 보이게 — 사장이 직원에게 공유할 1순위 정보.
- 다매장은 카드 stacking, 1매장이면 큰 카드 1개 + 강조.

**변화 요약**: 매장 1개만 편집 가능한 현행에서 **다매장 관리 진입점**으로 격상.

---

## 9. 마이그레이션 계획

### Phase A: 토큰 기반 다지기 (0.5일)

| 작업 | 영향 파일 | 회귀 리스크 | 출시 차단 |
|---|---|---|---|
| `tokens.ts` v2 확장 (colors.brand 객체화, typography.styles, breakpoint, useLayout) | 1 (theme/tokens.ts) | Low | X |
| Legacy alias 추가 (deprecated 주석) | 1 | None | X |
| `useLayout` hook 신규 | 1 | None | X |
| `responsive.tsx` deprecate 표시 (당장 삭제 X) | 1 | None | X |
| `appHeaderOptions.tsx` 헤더 배경 → `surface.background` | 1 | **Medium** (모든 헤더 색 변화) | X |
| Codemod 스크립트 작성 (jscodeshift): `COLORS.GRAY_X` → tokens 매핑, `COLORS.SODAM_ORANGE` → tokens | 1 (script) | None | X |
| ESLint no-hex 룰 적용 (warn 단계) | 1 (.eslintrc) | None | X |

**완료 기준**: `npm run lint` warn 수 < 100, tokens import 가능, 빌드 통과.

### Phase B: 공통 컴포넌트 10종 (1일)

| 작업 | 파일 | 회귀 | 차단 |
|---|---|---|---|
| `ScreenContainer.tsx` 신규 | 1 | None | X |
| `AppHeader.tsx` 신규 (기존 `Header.tsx` deprecate) | 2 | Low (기존 Header 미사용 화면 다수) | X |
| `Button.tsx` → `AppButton` rename + invertedPrimary variant 추가, `PrimaryButton.tsx` deprecate | 2 | Medium (codemod 동반) | X |
| `Input.tsx` → `AppInput` 확장 (required, counter, rightAction) | 1 | Low | X |
| `Card.tsx` → `AppCard` 확장 (variant=filled/outlined/flat/elevated, header.right), `SectionCard.tsx` deprecate | 2 | Low | X |
| `AppListItem.tsx` 신규 | 1 | None | X |
| `AppRadioGroup.tsx` / `AppCheckboxList.tsx` 신규 | 2 | None | X |
| `EmptyState.tsx` / `ErrorState.tsx` / `LoadingState.tsx` 신규 | 3 | None | X |
| `AppBottomSheet.tsx` 신규 (ConsentBlock 의 Modal 추출) | 1 | None | X |
| `CtaStack.tsx` 신규 | 1 | None | X |

**완료 기준**: Storybook 또는 화면 1개에서 모든 컴포넌트 시각 확인.

### Phase C: 진입 3화면 적용 (1일)

| 작업 | 파일 | 회귀 | 차단 |
|---|---|---|---|
| WelcomeMainScreen v2 적용 (invertedPrimary 버튼, 타이포 토큰화) | 1 | Low | **Yes** (첫 인상) |
| LoginScreen v2 적용 (그라디언트 brandHero 통일, AppCard, AppInput) | 1 | Medium (로그인 동작 보존) | **Yes** |
| SignupScreen v2 적용 (마진 정리, AppRadioGroup, CtaStack, 비밀번호 강도) | 1 | Medium (필수 동의 비활성 추가) | **Yes** |
| PasswordResetScreen 헤더만 v2 (이미 토큰화 OK) | 1 | Low | X |
| **HybridMainScreen 삭제 또는 dev-only 격리** | 1 | None | **Yes** (출시 차단 후보) |
| `appHeaderOptions` AppHeader 통합 | 1 | Medium | X |

**완료 기준**: 진입 흐름 (Splash → Onboarding → Welcome → Signup → Login) 시각 일관성 확인. 자동 테스트는 변경 없음.

### Phase D: 홈 + 출퇴근 (1.5일)

| 작업 | 파일 | 회귀 | 차단 |
|---|---|---|---|
| MasterMyPageScreen → MasterHomeScreen (8-5 템플릿) | 1 + 분해 컴포넌트 3~5 | High (API 호출 보존) | X |
| EmployeeMyPageRNScreen → EmployeeHomeScreen | 1 | High | X |
| PersonalUserScreen → PersonalHomeScreen + PersonalMyPageScreen 분리 | 2 | High | X |
| OwnerDashboardScreen → MasterHomeScreen 으로 통합 (중복 제거) | 1 (삭제) | Medium | X |
| AttendanceScreen 4분해 + 토큰화 | 1 → 5 | High | X |
| AttendanceCalendarScreen v2 반응형 | 1 | Low | X |
| EmployeeAttendanceHome v2 정리 (이미 tokens) | 1 | Low | X |

**완료 기준**: 매뉴얼 클릭 테스트 — 각 사용자 유형별 진입 후 홈 정상 동작.

### Phase E: 급여 + 마이페이지 + 매장 (1일)

| 작업 | 파일 | 회귀 | 차단 |
|---|---|---|---|
| SalaryListScreen v2 (Hero KPI + ListItem + EmptyState) | 1 | Medium (필터 기능 보존) | X |
| SalaryDetailScreen v2 (항목 카드 + 금액 위계) | 1 | Low | X |
| PayrollRunScreen 토큰화 | 1 | Medium | X |
| 사용자 유형별 MyPageScreen 신규 (8-9) | 1~3 | Medium | X |
| StoreManagementScreen 신규 (8-10) | 1 | Medium | X |
| WorkplaceListScreen / WorkplaceDetailScreen 통합 또는 polish | 2 | Low | X |
| 나머지 화면 codemod 적용 (info/qna/notification/referral/subscription/timeoff/settings) | ~14 | Low | X |

**완료 기준**: `COLORS.*` import 0개. 하드코딩 hex < 30개 (legacy boundary 만).

### Phase F (선택): 정리 (0.5일)

- `common/components/logo/Colors.ts` 삭제
- `utils/responsive.tsx` 삭제 (useLayout 로 대체 완료)
- `common/hooks/useDimensions.ts` `useJSISafeDimensions` 만 유지, 나머지 alias 정리
- `PrimaryButton.tsx`, `SectionCard.tsx`, `SectionHeader.tsx`, `Header.tsx` 삭제
- ESLint no-hex 룰 `warn` → `error`
- tokens.ts legacy alias 삭제

**총 예상**: **5일 (1인 풀타임)** + Phase F 0.5일.

---

## 10. 비호환 / 삭제 권고

### 10-1. 즉시 삭제 권고

| 파일/심볼 | 사유 | 처리 |
|---|---|---|
| `frontend/src/features/welcome/screens/HybridMainScreen.tsx` | dev placeholder, 라우터 미연결, "Hello World" 류 | **Phase C 에서 삭제** |
| `COLORS.SODAM_GREEN` (logo/Colors.ts) | 이름과 실제 색 불일치 (#A23B72 = 마젠타). 신규 작업자 오용 100% | **사용처 의도 재파악 후 매핑** (대부분 brand.primary 또는 정확한 시맨틱 색) |
| `COLORS.GRADIENT_SECONDARY` | 사용처 0 또는 Login/Signup 의 비브랜드 그라디언트 | 삭제 (Login/Signup 은 brandHero 로 변경) |
| `common/components/layout/Header.tsx` | 데스크탑 웹 헤더 패턴. 모바일 부적합. `useResponsiveStyles` 의존 | **사용처 0 확인 후 삭제** |
| `common/components/buttons/PrimaryButton.tsx` | `form/Button.tsx` 와 기능 중복, SODAM_BLUE 사용 (브랜드 충돌) | codemod 후 삭제 |
| `common/components/sections/SectionCard.tsx` | `data-display/Card.tsx` 와 기능 중복, COLORS 사용 | codemod 후 삭제 |
| `utils/responsive.tsx` | 데스크탑 브레이크포인트, 모바일 부적합, useResponsiveStyles 사용처 적음 | `useLayout` 으로 교체 후 삭제 |

### 10-2. 안티패턴 사례 (수정 후 동일 패턴 금지)

| 안티패턴 | 예시 파일:줄 | 대안 |
|---|---|---|
| 모듈 레벨 `Dimensions.get` | `myPage/screens/MasterMyPageScreen.tsx:60` (`const { width } = Dimensions.get('window'); const CARD_WIDTH = width * 0.85;`) | `useLayout()` 안에서 호출, 또는 카드 width 는 `{ width: '85%' }` |
| 결과 안 쓰는 `Dimensions.get` | `welcome/screens/UsageSelectionScreen.tsx:13` (`Dimensions.get('window');`), `myPage/screens/PersonalUserScreen.tsx:25` | 호출 제거 |
| 두 디자인 시스템 같은 파일 혼재 | `auth/screens/SignupScreen.tsx` (COLORS + ConsentBlock 의 tokens) | tokens 만 사용 |
| 그라디언트 색 화면마다 다름 | Welcome(brandHero) ≠ Login/Signup(블루-퍼플-마젠타) | `gradient.brandHero` 만 사용 |
| `position: 'absolute'` 로 하단 CTA | (Welcome 은 이미 수정됨, 다른 화면 산재) | `CtaStack` 컴포넌트 |
| 한 화면에 primary 버튼 2개 이상 | LoginScreen "로그인" + "구글" + "카카오" 모두 강한 톤 | primary 1개 + 나머지 outline |
| 카드 색을 카드별로 다르게 (`backgroundColor: cardData.color`) | `SignupScreen` 의 userTypeCard | `AppRadioGroup` 단일 brand 색 |
| 이모지를 UI 아이콘으로 | SignupScreen "🏠🏢👥", OnboardingCarouselScreen "📲💰🌿" | Ionicons (단, Onboarding 의 이모지는 일러스트성격이라 허용 가능 — 검토 필요) |
| `fontWeight: 'bold'` 문자열 | 다수 (`SODAM_ORANGE` 색 + bold 같은 화면) | `tokens.typography.styles.*` |

### 10-3. 더 이상 쓰면 안 되는 패턴 (룰)

1. `import { COLORS } from '../../../common/components/logo/Colors'` — **Phase A 종료 후 ESLint error**
2. `Dimensions.get(...)` 의 모듈 레벨 호출 — ESLint `no-restricted-syntax` 룰 추가
3. `<SafeAreaView style={...}>` (edges 미지정) — Phase B 종료 후 codemod
4. `<TouchableOpacity>` 직접 사용 (커스텀 버튼 새로 만들기) — `AppButton` 사용. 단, `Pressable` 자체는 OK (커스텀 인터랙션 시).
5. `StyleSheet` 안에 직접 hex (`'#FF6B35'`) — ESLint no-hex 룰
6. 인라인 styles 의 마법 숫자 (예: `padding: 30`) — `tokens.spacing.*` 또는 명시적 const

---

## 11. 구현 체크리스트 (메인 세션용)

> 메인 세션이 이 순서대로 따라가면 5일 안에 v2 적용 완료.

### Phase A — 토큰 기반 (0.5일)
- [ ] `tokens.ts` v2 확장 (colors.brand 객체, surface 객체, text 객체, border 객체, status 객체, domain 객체, overlay 객체, gradient brandHero/ctaStrong, typography.styles, breakpoint)
- [ ] `useLayout.ts` 신규 작성
- [ ] `responsive.tsx` 에 `@deprecated` JSDoc 추가
- [ ] `appHeaderOptions.tsx` 헤더 배경을 `surface.background` 로 변경 + tint 를 `text.primary` 로
- [ ] ESLint `no-restricted-syntax` 룰에 hex 정규식 + Dimensions 모듈 호출 추가 (warn)
- [ ] Codemod 스크립트 1개 (`scripts/migrate-colors.ts` 등): `COLORS.GRAY_*` / `COLORS.SODAM_*` / `COLORS.SUCCESS` 등 → tokens.colors.* 매핑

### Phase B — 공통 컴포넌트 (1일)
- [ ] `ScreenContainer` 작성 + 테스트 (background/scroll/kbAvoid/edges/paddingH/bottomCtaHeight/statusBar)
- [ ] `AppHeader` 작성 + appHeaderOptions 연동
- [ ] `AppButton` = Button.tsx 확장 (invertedPrimary variant 추가)
- [ ] `AppInput` = Input.tsx 확장 (required/counter/rightAction)
- [ ] `AppCard` = Card.tsx 확장 (variant=filled/outlined/flat/elevated, header.right)
- [ ] `AppListItem` 신규
- [ ] `AppRadioGroup` + `AppCheckboxList` 신규
- [ ] `EmptyState` / `ErrorState` / `LoadingState` 신규
- [ ] `AppBottomSheet` 신규 (ConsentBlock 의 Modal 로직 이관)
- [ ] `CtaStack` 신규

### Phase C — 진입 3화면 (1일)
- [ ] WelcomeMainScreen v2 (invertedPrimary, 타이포 토큰화)
- [ ] LoginScreen v2 (brandHero, AppCard, AppInput, AppButton)
- [ ] SignupScreen v2 (마진 단일화, AppRadioGroup, CtaStack, 비밀번호 강도, 가입 disabled 조건)
- [ ] PasswordResetScreen 헤더 v2
- [ ] HybridMainScreen 삭제 (또는 `__dev__` 만 진입 가능하도록 격리)

### Phase D — 홈 + 출퇴근 (1.5일)
- [ ] 3종 홈 화면 신규 (MasterHome / PersonalHome / EmployeeHome) — 8-5 템플릿
- [ ] 기존 MyPage 화면들에서 홈 섹션 추출 후 마이페이지는 8-9 형태로 축소
- [ ] OwnerDashboardScreen → MasterHomeScreen 흡수 / 라우터 정리
- [ ] AttendanceScreen 4분해 + 토큰화
- [ ] AttendanceCalendarScreen 반응형
- [ ] EmployeeAttendanceHome 정리

### Phase E — 급여 + 마이페이지 + 매장 (1일)
- [ ] SalaryListScreen v2
- [ ] SalaryDetailScreen v2 (금액 위계)
- [ ] PayrollRunScreen 토큰화
- [ ] MyPageScreen × 사용자 유형 (8-9)
- [ ] StoreManagementScreen 신규 (8-10)
- [ ] 나머지 14개 화면 codemod 적용 (info/qna/notification/referral/subscription/timeoff/settings/workplace)

### Phase F — 정리 (0.5일)
- [ ] `Colors.ts`, `Header.tsx`, `PrimaryButton.tsx`, `SectionCard.tsx`, `SectionHeader.tsx`, `responsive.tsx` 삭제
- [ ] tokens.ts legacy alias 삭제
- [ ] ESLint no-hex 룰 warn → error
- [ ] CHANGELOG: "디자인 시스템 v2 적용 완료"

---

## 부록 A — 권장 코드 스니펫

### A-1. 새 화면 1개 작성 시 골격

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../../theme/tokens';
import ScreenContainer from '../../common/components/layout/ScreenContainer';
import AppHeader from '../../common/components/layout/AppHeader';
import AppCard from '../../common/components/data-display/AppCard';
import AppButton from '../../common/components/form/AppButton';
import CtaStack from '../../common/components/overlay/CtaStack';

const NewScreen: React.FC = () => {
    return (
        <>
            <AppHeader title="화면 제목" left="back" />
            <ScreenContainer background="plain" scroll bottomCtaHeight={80}>
                <Text style={tokens.typography.styles.headingMd}>섹션 제목</Text>
                <AppCard variant="elevated">
                    <Text style={tokens.typography.styles.bodyLg}>본문</Text>
                </AppCard>
            </ScreenContainer>
            <CtaStack>
                <AppButton title="다음" onPress={() => {}} variant="primary" size="lg" fullWidth />
            </CtaStack>
        </>
    );
};
export default NewScreen;
```

### A-2. 폼 화면 골격 (KeyboardAvoiding 포함)

```tsx
<AppHeader title="회원가입" left="back" />
<ScreenContainer background="gradient" scroll kbAvoid bottomCtaHeight={92}>
    <AppCard variant="flat" padding="xl">
        <AppInput label="이메일" required value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" />
        <AppInput label="비밀번호" required value={pwd} onChangeText={setPwd}
                  secureTextEntry rightAction={{ type: 'password' }}
                  helperText="8자 이상" />
    </AppCard>
</ScreenContainer>
<CtaStack>
    <AppButton title="가입하기" variant="primary" size="lg" fullWidth
               disabled={!canSubmit} loading={loading} onPress={submit} />
</CtaStack>
```

### A-3. 빈/오류/로딩 상태

```tsx
if (loading) return <LoadingState message="불러오는 중..." layout="full" />;
if (error)   return <ErrorState variant="network" title="연결이 불안정해요"
                                description="잠시 후 다시 시도해 주세요"
                                onRetry={load} />;
if (items.length === 0) {
    return <EmptyState icon="document-outline" title="아직 정산 내역이 없어요"
                       description="첫 정산을 실행해 볼까요?"
                       action={{ label: '정산 실행', onPress: runPayroll }} />;
}
```

---

## 부록 B — 변경 영향도 요약

| 측면 | 변경 전 | 변경 후 |
|---|---|---|
| 색 시스템 | 2개 (tokens + COLORS) | 1개 (tokens.colors.*) |
| 헤더 배경 | SODAM_BLUE 파랑 | surface.background 흰 (모든 화면) |
| 그라디언트 | 화면별 제각각 (2~4색) | brandHero 단일 (진입 화면만) |
| 카드 | 2개 컴포넌트 (Card, SectionCard) | 1개 (AppCard, 4 variants) |
| 버튼 | 2개 (Button, PrimaryButton) | 1개 (AppButton, 5 variants × 3 sizes) |
| 화면 컨테이너 | 화면별 SafeArea + KbAvoid + ScrollView 직접 조립 | ScreenContainer 1개 |
| 반응형 hook | useResponsiveStyles (데스크탑 BP) | useLayout (모바일 BP + insets + heroLogo 등) |
| 빈/오류/로딩 | 화면마다 인라인 | EmptyState/ErrorState/LoadingState |
| Hex 색 사용 | 566회 | (목표) < 30회 (Phase F 후 0) |
| KeyboardAvoidingView 미적용 폼 | 6+ 화면 | 0 (ScreenContainer kbAvoid) |
| 사용 안 되는 Dimensions 호출 | 2건 | 0 |

---

## 부록 C — 와이어프레임 참조

다음 기존 문서와 본 사양은 **본 사양이 우선**:
- `docs/05-design/wireframes/` 의 화면별 와이어 — UI 의도는 유효, 토큰/컴포넌트는 본 사양 적용
- `docs/05-design/brand-copy-audit.md` — 카피 톤은 그대로 적용 (UI 위에 얹음)
- `docs/05-design/brand-copy-empty-states.md` — EmptyState 컴포넌트의 기본 카피 라이브러리로 사용

---

**문서 끝**.

본 사양에 모호한 부분이 있으면 메인 세션이 `AskUserQuestion` 으로 단일 결정만 묻고 진행. 추측 금지.
