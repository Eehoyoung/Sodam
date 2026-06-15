/**
 * @deprecated 2026-05-29 — common/providers/ThemeProvider 로 통합.
 *
 * 이 파일은 import 호환을 위한 re-export shim 이다. 새 코드는
 *   import {useTheme, useThemeColors, ThemeProvider} from '../common/providers/ThemeProvider';
 * 를 사용한다. 이전에 자체 iOS HIG 풍 색상 정의가 있었으나 브랜드 컬러(#FF6B35)와
 * 충돌해 제거. 모든 팔레트는 theme/tokens 의 colors / darkColors 에서만 옴.
 */
import ThemeProvider from '../common/providers/ThemeProvider';

export {
    ThemeProvider,
    useTheme,
    useThemeColors,
    useThemedValue,
    useThemeTokens,
} from '../common/providers/ThemeProvider';
export type {ThemeMode, ThemeColors, ResolvedTheme} from '../common/providers/ThemeProvider';
export default ThemeProvider;
