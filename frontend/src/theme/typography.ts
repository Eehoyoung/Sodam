// Basic typography tokens

export const typography = {
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 28,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        bold: '700' as const,
    },
};

export type Typography = typeof typography;
export default typography;
