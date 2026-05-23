import React, {createContext, useContext} from 'react';
import {colors, Colors} from '../../theme/colors';
import {typography, Typography} from '../../theme/typography';

interface ThemeTokens {
    colors: Colors;
    typography: Typography;
    isDark: boolean;
}

const ThemeTokensContext = createContext<ThemeTokens | undefined>(undefined);

export const useThemeTokens = (): ThemeTokens => {
    const ctx = useContext(ThemeTokensContext);
    if (!ctx) {
        // Fail-safe: provide defaults when provider is missing
        return {colors, typography, isDark: false};
    }
    return ctx;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

// Minimal ThemeProvider (no storage, no system listeners, safe for early iterations)
export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
    const value: ThemeTokens = {
        colors,
        typography,
        isDark: false,
    };

    return (
        <ThemeTokensContext.Provider value={value}>
            {children}
        </ThemeTokensContext.Provider>
    );
};

export default ThemeProvider;
