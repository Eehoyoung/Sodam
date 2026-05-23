/**
 * Legacy re-export — 단일 토큰은 ./tokens.ts 참고.
 * 기존 import("../theme/theme") 코드 호환용.
 */
import {colors as tokenColors, spacing as tokenSpacing} from './tokens';

// Legacy keys mapping
export const colors = {
    primary: tokenColors.brandPrimary,
    secondary: tokenColors.brandSecondary,
    background: tokenColors.background,
    card: tokenColors.surface,
    text: tokenColors.textPrimary,
    textSecondary: tokenColors.textSecondary,
    border: tokenColors.border,
    notification: tokenColors.error,
    success: tokenColors.success,
    warning: tokenColors.warning,
    error: tokenColors.error,
};

export const spacing = tokenSpacing;
