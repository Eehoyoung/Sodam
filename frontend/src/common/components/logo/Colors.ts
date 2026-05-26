/**
 * 레거시 COLORS 팔레트 — 확정 디자인 토큰(theme/tokens.ts)으로 리매핑됨.
 *
 * 신규 코드는 `theme/tokens.ts`를 직접 쓰고, 이 파일은 아직 마이그레이션되지 않은
 * 레거시 화면들이 자동으로 확정 브랜드 색을 입도록 하는 호환 레이어다.
 *   - SODAM_BLUE/GREEN → 확정 네이비(#243B4A) 로 통일 (기존 청록/마젠타 폐기)
 *   - GRAY_* → 따뜻한 중성 톤 (confirmed text/border 팔레트)
 *   - 그라디언트 → 브랜드 오렌지 / 네이비
 */
export const COLORS = {
    // 브랜드 컬러 (확정)
    SODAM_ORANGE: '#FF6B35',
    SODAM_BLUE: '#243B4A',   // 확정 네이비 (기존 #2E86AB 폐기)
    SODAM_GREEN: '#243B4A',  // 마젠타 폐기 → 네이비로 통일

    // 그라데이션 (확정)
    GRADIENT_PRIMARY: ['#FF6B35', '#FF9B63'],
    GRADIENT_SECONDARY: ['#243B4A', '#172932'],

    // 시스템 컬러
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    // 따뜻한 중성 톤 (confirmed surface/text/border)
    GRAY_50: '#FFFBF5',
    GRAY_100: '#EFE7DF',
    GRAY_200: '#E8E0D8',
    GRAY_300: '#D8CDC3',
    GRAY_400: '#C9C0B8',
    GRAY_500: '#9A9189',
    GRAY_600: '#625B55',
    GRAY_700: '#4A433D',
    GRAY_800: '#2E2823',
    GRAY_900: '#201A17',

    // 상태 컬러 (확정)
    SUCCESS: '#12A87B',
    WARNING: '#F59E0B',
    ERROR: '#E5484D',
    INFO: '#3B82F6',
} as const;
