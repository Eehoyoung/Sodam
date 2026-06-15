/**
 * useThemeColors — 다크 모드 팔레트 진입점 (A15).
 *
 * 단일 출처: common/providers/ThemeProvider 의 ThemeContext.
 * 이전 버전은 useColorScheme 만 사용해 persist/system 모드를 무시했음 — 통합 후 deprecate.
 */
export {useThemeColors, useThemedValue, useTheme} from '../providers/ThemeProvider';
export type {ThemeMode, ThemeColors, ResolvedTheme} from '../providers/ThemeProvider';
