/**
 * 앱 전체에서 사용되는 테마 스타일 정의
 */

// 색상 정의
export const colors = {
    primary: '#4A6FFF',
    secondary: '#FF6B6B',
    background: '#F9F9F9',
    card: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    border: '#E0E0E0',
    notification: '#FF3B30',
    success: '#34C759',
    warning: '#FFCC00',
    error: '#FF3B30',
    info: '#5AC8FA',
};

// 간격 정의
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// 폰트 크기 정의
export const fontSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
};

// 폰트 두께 정의
export const fontWeights = {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
};

// 그림자 스타일 정의
export const shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
};

// 테두리 반경 정의
export const borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
};
