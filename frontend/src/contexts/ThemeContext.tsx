import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {Appearance, ColorSchemeName} from 'react-native';
import {unifiedStorage} from '../common/utils/unifiedStorage';
import {safeLogger} from '../utils/safeLogger';

/**
 * 색상 스키마 정의
 */
export interface ColorScheme {
    // 기본 색상
    primary: string;
    secondary: string;
    accent: string;

    // 배경 색상
    background: string;
    surface: string;
    card: string;

    // 텍스트 색상
    text: string;
    textSecondary: string;
    textDisabled: string;

    // 상태 색상
    success: string;
    warning: string;
    error: string;
    info: string;

    // 경계선 색상
    border: string;
    divider: string;

    // 그림자 색상
    shadow: string;

    // 오버레이 색상
    overlay: string;
}

/**
 * 라이트 테마 색상
 */
const lightColors: ColorScheme = {
    primary: '#007AFF',
    secondary: '#5856D6',
    accent: '#FF9500',

    background: '#FFFFFF',
    surface: '#F2F2F7',
    card: '#FFFFFF',

    text: '#000000',
    textSecondary: '#6D6D70',
    textDisabled: '#C7C7CC',

    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',

    border: '#C6C6C8',
    divider: '#E5E5EA',

    shadow: '#000000',

    overlay: 'rgba(0, 0, 0, 0.4)',
};

/**
 * 다크 테마 색상
 */
const darkColors: ColorScheme = {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    accent: '#FF9F0A',

    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',

    text: '#FFFFFF',
    textSecondary: '#98989D',
    textDisabled: '#48484A',

    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#0A84FF',

    border: '#38383A',
    divider: '#2C2C2E',

    shadow: '#000000',

    overlay: 'rgba(0, 0, 0, 0.6)',
};

/**
 * 테마 타입 정의
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 테마 컨텍스트 타입 정의
 */
interface ThemeContextType {
    // 현재 테마 모드
    mode: ThemeMode;

    // 실제 적용된 색상 스키마 (system 모드일 때는 시스템 설정에 따라 결정)
    colors: ColorScheme;

    // 현재 다크 모드 여부
    isDark: boolean;

    // 테마 변경 함수
    setTheme: (mode: ThemeMode) => void;

    // 테마 토글 함수 (light <-> dark)
    toggleTheme: () => void;
}

/**
 * 기본 테마 컨텍스트 값
 */
const defaultThemeContext: ThemeContextType = {
    mode: 'system',
    colors: lightColors,
    isDark: false,
    setTheme: () => {
        throw new Error('ThemeProvider not found');
    },
    toggleTheme: () => {
        throw new Error('ThemeProvider not found');
    },
};

/**
 * 테마 컨텍스트 생성
 */
const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

/**
 * 테마 컨텍스트 훅
 */
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        console.error('[useTheme] ThemeContext not found - using default values');
        safeLogger.error('ThemeContext not found', new Error('ThemeProvider not mounted'));

        // 기본값 반환으로 앱 크래시 방지
        return defaultThemeContext;
    }

    return context;
};

/**
 * ThemeProvider Props 인터페이스
 */
interface ThemeProviderProps {
    children: ReactNode;
    initialTheme?: ThemeMode;
}

/**
 * 테마 프로바이더 컴포넌트
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
                                                                children,
                                                                initialTheme = 'system'
                                                            }) => {
    const [mode, setMode] = useState<ThemeMode>(initialTheme);
    const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
        Appearance.getColorScheme()
    );

    /**
     * 저장된 테마 설정 로드
     */
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedTheme = await unifiedStorage.getItem('theme_preference');
                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setMode(savedTheme as ThemeMode);
                    console.log('[ThemeProvider] 저장된 테마 설정 로드:', savedTheme);
                }
            } catch (error) {
                console.error('[ThemeProvider] 테마 설정 로드 실패:', error);
                safeLogger.error('Failed to load theme preference', error);
            }
        };

        loadThemePreference();
    }, []);

    /**
     * 시스템 테마 변경 감지
     */
    useEffect(() => {
        const subscription = Appearance.addChangeListener(({colorScheme}) => {
            console.log('[ThemeProvider] 시스템 테마 변경 감지:', colorScheme);
            setSystemColorScheme(colorScheme);
        });

        return () => subscription?.remove();
    }, []);

    /**
     * 테마 설정 저장
     */
    const saveThemePreference = async (newMode: ThemeMode) => {
        try {
            await unifiedStorage.setItem('theme_preference', newMode);
            console.log('[ThemeProvider] 테마 설정 저장:', newMode);
        } catch (error) {
            console.error('[ThemeProvider] 테마 설정 저장 실패:', error);
            safeLogger.error('Failed to save theme preference', error);
        }
    };

    /**
     * 테마 변경 함수
     */
    const setTheme = (newMode: ThemeMode) => {
        setMode(newMode);
        saveThemePreference(newMode);
        console.log('[ThemeProvider] 테마 변경:', newMode);
    };

    /**
     * 테마 토글 함수
     */
    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setTheme(newMode);
    };

    /**
     * 현재 적용할 색상 스키마 계산
     */
    const getCurrentColors = (): ColorScheme => {
        if (mode === 'system') {
            return systemColorScheme === 'dark' ? darkColors : lightColors;
        }
        return mode === 'dark' ? darkColors : lightColors;
    };

    /**
     * 현재 다크 모드 여부 계산
     */
    const isDark = (): boolean => {
        if (mode === 'system') {
            return systemColorScheme === 'dark';
        }
        return mode === 'dark';
    };

    /**
     * 컨텍스트 값 생성
     */
    const contextValue: ThemeContextType = {
        mode,
        colors: getCurrentColors(),
        isDark: isDark(),
        setTheme,
        toggleTheme,
    };

    /**
     * 디버깅을 위한 상태 로깅
     */
    useEffect(() => {
        if (__DEV__) {
            console.log('[ThemeProvider] 테마 상태 변경:', {
                mode,
                systemColorScheme,
                isDark: isDark(),
                colors: getCurrentColors(),
            });
        }
    }, [mode, systemColorScheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * 테마 색상 직접 접근 헬퍼
 */
export const useThemeColors = (): ColorScheme => {
    const {colors} = useTheme();
    return colors;
};

/**
 * 조건부 테마 값 선택 헬퍼
 */
export function useThemedValue<T>(lightValue: T, darkValue: T): T {
    const {isDark} = useTheme();
    return isDark ? darkValue : lightValue;
}

/**
 * 테마 기반 스타일 생성 헬퍼
 */
export function createThemedStyles<T extends Record<string, any>>(
    styleFactory: (colors: ColorScheme, isDark: boolean) => T
): (colors: ColorScheme, isDark: boolean) => T {
    return (colors: ColorScheme, isDark: boolean): T => {
        return styleFactory(colors, isDark);
    };
}

export default ThemeContext;
