/**
 * 소담 디자인 토큰 — 단일 진실 공급원 (Single Source of Truth).
 *
 * 브랜드 톤:
 *   - 소상공인 페르소나를 위한 따뜻한 오렌지 (시프티의 파랑, 알밤의 초록과 차별화)
 *   - 한국 전통의 감 색감을 모티프로 한 #FF6B35
 *
 * 모든 색/간격/타이포는 이 파일에서만 정의하고,
 * 다른 곳에서는 반드시 import { tokens } from './tokens' 으로 사용.
 */

export const colors = {
    // === Brand === (launch-redesign/design-tokens.json 2026.05.25 확정)
    brandPrimary: '#FF6B35',       // 소담 시그니처 오렌지 — 화면당 1차 행동에만
    brandPrimaryDark: '#E85A2A',   // pressed
    brandPrimaryLight: '#FF9B63',
    brandPrimarySoft: '#FFF0E8',   // 연한 브랜드 배경
    brandPrimaryMuted: '#FFB48F',
    brandSecondary: '#243B4A',     // 네이비 — HeroCard/진한 헤더 텍스트
    brandAccent: '#F4A261',        // 보조 강조 (배지/포인트)

    // === Surface ===
    background: '#FFFFFF',          // 기본 화면/카드
    surface: '#FFFFFF',            // 기본 카드 (명시용 별칭)
    surfaceCanvas: '#F7F4EF',       // 앱 배경 (스크린 캔버스)
    surfaceWarm: '#FFFBF5',         // 따뜻한 카드 (추천/인사이트)
    surfaceMuted: '#F1EEE9',        // 비활성/disabled 배경
    surfaceMint: '#EEF8F4',         // 성공/출근 보조 배경
    surfaceSky: '#EEF5FF',          // 정보 보조 배경
    surfaceInverse: '#201A17',      // 다크 시트
    border: '#E8E0D8',
    borderStrong: '#D8CDC3',
    borderFocus: '#FF6B35',
    divider: '#EFE7DF',

    // === Text ===
    textPrimary: '#201A17',
    textSecondary: '#625B55',
    textTertiary: '#9A9189',
    textInverse: '#FFFFFF',
    textBrand: '#FF6B35',
    textDisabled: '#C9C0B8',

    // === Status === (색 단독 의미전달 금지 — 텍스트 배지와 함께)
    success: '#12A87B',
    successBg: '#DFF6ED',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    error: '#E5484D',
    errorBg: '#FEE2E2',
    info: '#3B82F6',
    infoBg: '#DBEAFE',

    // === Domain colors (status badges 등) ===
    attendanceCheckedIn: '#12A87B',
    attendanceCheckedOut: '#3B82F6',
    payrollPaid: '#12A87B',
    payrollPending: '#F59E0B',
    payrollCancelled: '#E5484D',

    // === Translucent ===
    overlayDark: 'rgba(32, 26, 23, 0.55)',
    shadowColor: '#243B4A',
} as const;

/**
 * 다크 모드 팔레트 (A15) — `colors`와 동일 키 셰입.
 * useThemeColors() 가 시스템 색상에 따라 light/dark 를 고른다.
 * ⚠️ 전 컴포넌트가 useThemeColors() 로 전환되기 전까지는 부분 적용 금지
 *   (반쪽 다크는 라이트 잔재와 섞여 깨져 보임). 활성화는 일괄 마이그레이션 후.
 */
export const darkColors: Record<keyof typeof colors, string> = {
    brandPrimary: '#FF7A45',
    brandPrimaryDark: '#E85A2A',
    brandPrimaryLight: '#FF9B63',
    brandPrimarySoft: '#3A2A22',
    brandPrimaryMuted: '#7A4A33',
    brandSecondary: '#9FB6C4',
    brandAccent: '#F4A261',

    background: '#1B1714',
    surface: '#241F1B',
    surfaceCanvas: '#161311',
    surfaceWarm: '#241F1B',
    surfaceMuted: '#2E2823',
    surfaceMint: '#15302A',
    surfaceSky: '#15263A',
    surfaceInverse: '#F7F4EF',
    border: '#3A332E',
    borderStrong: '#4A433D',
    borderFocus: '#FF7A45',
    divider: '#2E2823',

    textPrimary: '#F5EFE9',
    textSecondary: '#C9C0B8',
    textTertiary: '#9A9189',
    textInverse: '#201A17',
    textBrand: '#FF8A5C',
    textDisabled: '#5A534D',

    success: '#3FC79A',
    successBg: '#15302A',
    warning: '#F5B53D',
    warningBg: '#3A2E14',
    error: '#FF6B6F',
    errorBg: '#3A1E1F',
    info: '#5B9BFF',
    infoBg: '#15263A',

    attendanceCheckedIn: '#3FC79A',
    attendanceCheckedOut: '#5B9BFF',
    payrollPaid: '#3FC79A',
    payrollPending: '#F5B53D',
    payrollCancelled: '#FF6B6F',

    overlayDark: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#000000',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const;

export const radius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,   // HeroCard / 바텀시트 상단
    pill: 999,
} as const;

export const typography = {
    sizes: {
        xs: 12,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
        display: 32,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
    },
    fontFamily: {
        // RN 기본 시스템 폰트 사용 (Android: Roboto, iOS: SF Pro)
        // 한국어는 시스템 폰트로 충분 — 별도 폰트 번들 X (앱 크기/부팅 시간 절감)
    },
    /**
     * 명명형 텍스트 스케일 — 05-design-system.md 타이포 표 확정값.
     * { fontSize, lineHeight(px), fontWeight } 형태로 Text style 에 펼쳐 쓴다.
     * 반응형 글자 스케일은 useResponsive().font() 로 적용 (compact 에서 축소).
     */
    scale: {
        display: {fontSize: 32, lineHeight: 38, fontWeight: '700' as const},
        headingLg: {fontSize: 26, lineHeight: 34, fontWeight: '700' as const},
        headingMd: {fontSize: 22, lineHeight: 30, fontWeight: '700' as const},
        headingSm: {fontSize: 18, lineHeight: 26, fontWeight: '700' as const},
        titleMd: {fontSize: 15, lineHeight: 22, fontWeight: '600' as const},
        bodyLg: {fontSize: 17, lineHeight: 26, fontWeight: '400' as const},
        bodyMd: {fontSize: 15, lineHeight: 23, fontWeight: '400' as const},
        caption: {fontSize: 12, lineHeight: 16, fontWeight: '400' as const},
        numericLg: {fontSize: 28, lineHeight: 34, fontWeight: '700' as const},
    },
} as const;

export const shadow = {
    sm: {
        shadowColor: colors.shadowColor,
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: colors.shadowColor,
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    lg: {
        shadowColor: colors.shadowColor,
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.14,
        shadowRadius: 14,
        elevation: 6,
    },
    /** 브랜드 CTA 전용 — 강한 그림자 + 오렌지 라이트 글로우 (Android elevation 한계로 iOS 우선 효과) */
    brand: {
        shadowColor: '#FF6B35',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.32,
        shadowRadius: 16,
        elevation: 8,
    },
} as const;

/**
 * 그라디언트 — LinearGradient(react-native-linear-gradient) colors 배열로 사용.
 * 사용 예:
 *   import LinearGradient from 'react-native-linear-gradient';
 *   <LinearGradient colors={tokens.gradient.brand} ... />
 */
export const gradient = {
    brand: ['#FF6B35', '#FF9B63'] as [string, string],       // 확정 시안 마크/펀치 버튼
    brandStrong: ['#FF7A1A', '#FF5722'] as [string, string], // 진한 히어로 배경
    brandSoft: ['#FFB48F', '#FF9B63'] as [string, string],
    navy: ['#263F4F', '#172932'] as [string, string],        // 다크 스크린 배경
    darkScreen: ['#263F4F', '#172932', '#2B2019'] as [string, string, string],
    success: ['#34D399', '#12A87B'] as [string, string],
    warning: ['#FBBF24', '#F59E0B'] as [string, string],
    surfaceWarm: ['#FFFBF5', '#FFF5EC'] as [string, string],
} as const;

export const layout = {
    minTouchTarget: 44, // iOS HIG / Android: 최소 터치 영역
    headerHeight: 56,
    bottomTabHeight: 64,
    screenPaddingHorizontal: spacing.lg,
} as const;

export const motion = {
    durationFast: 150,
    durationNormal: 240,
    durationSlow: 360,
    pressScale: 0.97,   // 버튼 press 시 축소 비율
} as const;

/**
 * 반응형 브레이크포인트 — 06-responsive-accessibility-qa.md 확정.
 * useResponsive 훅이 이 값을 사용한다. (모듈 레벨 Dimensions 호출 금지)
 */
export const breakpoints = {
    compact: 360,   // < 360: 작은 Android, 긴 텍스트 압축
    normal: 430,    // 360-430: 기본 모바일
    wide: 767,      // 431-767: 큰 모바일/폴더블
    // >= 768: tablet (2열 가능)
    compactHeight: 700, // < 700: 큰 원형 CTA/hero 축소
} as const;

export const tokens = {
    colors,
    spacing,
    radius,
    typography,
    shadow,
    gradient,
    layout,
    motion,
    breakpoints,
} as const;

export type Tokens = typeof tokens;
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export default tokens;
