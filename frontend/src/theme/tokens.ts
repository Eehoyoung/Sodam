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
    // === Brand ===
    brandPrimary: '#FF6B35',       // 소담 시그니처 오렌지
    brandPrimaryDark: '#E5552A',
    brandPrimaryLight: '#FF8A5C',
    brandSecondary: '#2A4759',     // 안정감 있는 다크 네이비 (텍스트/헤더 보조)
    brandAccent: '#F4A261',        // 보조 강조 (배지/포인트)

    // === Surface ===
    background: '#FFFFFF',          // 메인 배경
    surface: '#FFFCF7',             // 카드/시트 등 미묘한 따뜻한 톤
    surfaceMuted: '#F5F5F4',
    border: '#E7E5E4',
    divider: '#F1EFEC',

    // === Text ===
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textTertiary: '#A8A29E',
    textInverse: '#FFFFFF',
    textBrand: '#FF6B35',
    textDisabled: '#D6D3D1',

    // === Status ===
    success: '#10B981',
    successBg: '#D1FAE5',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    error: '#EF4444',
    errorBg: '#FEE2E2',
    info: '#3B82F6',
    infoBg: '#DBEAFE',

    // === Domain colors (status badges 등) ===
    attendanceCheckedIn: '#10B981',
    attendanceCheckedOut: '#6366F1',
    payrollPaid: '#10B981',
    payrollPending: '#F59E0B',
    payrollCancelled: '#EF4444',

    // === Translucent ===
    overlayDark: 'rgba(28, 25, 23, 0.55)',
    shadowColor: '#1C1917',
} as const;

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
    brand: ['#FF7A1A', '#FF5722'] as [string, string],
    brandSoft: ['#FFB48F', '#FF8A5C'] as [string, string],
    success: ['#34D399', '#10B981'] as [string, string],
    warning: ['#FBBF24', '#F59E0B'] as [string, string],
    surfaceWarm: ['#FFFCF7', '#FFF5EC'] as [string, string],
} as const;

export const layout = {
    minTouchTarget: 44, // iOS HIG / Android: 최소 터치 영역
    headerHeight: 56,
    bottomTabHeight: 60,
    screenPaddingHorizontal: spacing.lg,
} as const;

export const motion = {
    durationFast: 150,
    durationNormal: 250,
    durationSlow: 400,
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
} as const;

export type Tokens = typeof tokens;
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export default tokens;
