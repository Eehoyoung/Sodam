/**
 * ThemeProvider — 다크 모드 단일 진실 공급원 (A15).
 *
 * 아키텍처:
 *   - 색상 토큰은 theme/tokens 의 colors(light) / darkColors(dark) 만 사용
 *   - 모드: 'light' | 'dark' | 'system' (시스템 = OS Appearance)
 *   - persist: unifiedStorage('theme_preference')
 *   - 모든 컴포넌트는 useThemeColors() 훅으로 현재 모드의 팔레트를 받는다.
 *
 * 이전(2026-05 이전) 구현:
 *   - common/providers/ThemeProvider 는 isDark=false 고정 stub
 *   - contexts/ThemeContext 는 자체 iOS HIG 풍 색상(브랜드 컬러 불일치)
 *   둘 다 deprecate. 본 파일이 단일 진입점.
 */
import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance, ColorSchemeName} from 'react-native';
import {colors as lightColors, darkColors} from '../../theme/tokens';
import {unifiedStorage} from '../utils/unifiedStorage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
// 라이트(const-asserted literal)와 다크(loose string)의 결합 타입은 literal 로 좁히면 다크값을 거부한다.
// 따라서 string 으로 완화 — 키 셰입만 보존.
export type ThemeColors = Record<keyof typeof lightColors, string>;

interface ThemeContextValue {
    mode: ThemeMode;
    resolved: ResolvedTheme;
    isDark: boolean;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
    toggle: () => void;
}

const STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * 현재 모드의 팔레트를 반환. 컴포넌트에서 정적 colors import 대신 이걸 사용.
 *
 * Provider 가 없으면 light 팔레트로 폴백 (테스트·미마운트 경로 안전).
 */
export const useThemeColors = (): ThemeColors => {
    const ctx = useContext(ThemeContext);
    return ctx?.colors ?? (lightColors as unknown as ThemeColors);
};

/** 모드/토글 등 전체 컨텍스트 접근 */
export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        // Provider 미마운트 fail-safe
        return {
            mode: 'light',
            resolved: 'light',
            isDark: false,
            colors: lightColors as unknown as ThemeColors,
            setMode: () => {},
            toggle: () => {},
        };
    }
    return ctx;
};

/** 라이트/다크 값을 한 줄로 분기. 예: useThemedValue('#fff','#000') */
export function useThemedValue<T>(light: T, dark: T): T {
    return useTheme().isDark ? dark : light;
}

const resolveColors = (mode: ThemeMode, systemScheme: ColorSchemeName): {resolved: ResolvedTheme; palette: ThemeColors} => {
    const resolved: ResolvedTheme = mode === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : mode;
    return {resolved, palette: resolved === 'dark' ? darkColors : (lightColors as unknown as ThemeColors)};
};

interface ThemeProviderProps {
    children: ReactNode;
    /** 테스트/스토리북에서 강제 모드 (system 무시) */
    forcedMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children, forcedMode}) => {
    const [mode, setModeState] = useState<ThemeMode>(forcedMode ?? 'system');
    const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

    // 저장된 선호 모드 1회 로드
    useEffect(() => {
        if (forcedMode) {
            return;
        }
        (async () => {
            try {
                const saved = await unifiedStorage.getItem(STORAGE_KEY);
                if (saved === 'light' || saved === 'dark' || saved === 'system') {
                    setModeState(saved);
                }
            } catch (_) {/* ignore */}
        })();
    }, [forcedMode]);

    // 시스템 색상 변경 감지 (system 모드일 때만 의미 있음)
    useEffect(() => {
        const sub = Appearance.addChangeListener(({colorScheme}) => setSystemScheme(colorScheme));
        return () => sub?.remove?.();
    }, []);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        unifiedStorage.setItem(STORAGE_KEY, next).catch(() => {/* ignore */});
    }, []);

    const toggle = useCallback(() => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    }, [mode, setMode]);

    const value = useMemo<ThemeContextValue>(() => {
        const {resolved, palette} = resolveColors(mode, systemScheme);
        return {
            mode,
            resolved,
            isDark: resolved === 'dark',
            colors: palette,
            setMode,
            toggle,
        };
    }, [mode, systemScheme, setMode, toggle]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** 레거시 호환 — 이전 코드가 useThemeTokens 를 호출하던 경우 */
export const useThemeTokens = () => {
    const t = useTheme();
    return {colors: t.colors, isDark: t.isDark};
};

export default ThemeProvider;
