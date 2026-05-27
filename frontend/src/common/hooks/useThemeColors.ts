/**
 * useThemeColors — 시스템 색상 모드(라이트/다크)에 따라 토큰 색 팔레트를 반환 (A15).
 *
 * 사용: const c = useThemeColors(); ... color: c.textPrimary
 *
 * ⚠️ 다크 모드 활성화 정책:
 *   현재 대부분의 컴포넌트는 theme/tokens 의 정적 `colors` 를 직접 import 한다.
 *   다크를 실제 적용하려면 그 컴포넌트들을 이 훅 기반으로 일괄 전환해야 한다
 *   (부분 전환 시 라이트/다크가 섞여 깨져 보이므로 금지). 본 훅 + darkColors 는
 *   그 일괄 마이그레이션을 위한 기반(foundation)이다.
 */
import {useColorScheme} from 'react-native';
import {colors, darkColors} from '../../theme/tokens';

export type ThemeMode = 'light' | 'dark';

export const useThemeColors = (override?: ThemeMode) => {
    const scheme = useColorScheme();
    const mode: ThemeMode = override ?? (scheme === 'dark' ? 'dark' : 'light');
    return mode === 'dark' ? darkColors : colors;
};

export default useThemeColors;
