import {Dimensions} from 'react-native';

// 반응형 디자인을 위한 브레이크포인트 정의
const breakpoints = {
    small: 576,
    medium: 768,
    large: 992,
    xlarge: 1200,
    // 1080x2400 해상도를 위한 특별 브레이크포인트 추가
    fullHD: 1080,
};

// 현재 화면 크기에 따라 스타일을 조정하는 유틸리티 함수
export const useResponsiveStyles = () => {
    const {width} = Dimensions.get('window');

    const isSmallScreen = width < breakpoints.medium;
    const isMediumScreen = width >= breakpoints.medium && width < breakpoints.large;
    const isLargeScreen = width >= breakpoints.large && width < breakpoints.xlarge;
    const isXLargeScreen = width >= breakpoints.xlarge;
    // 1080x2400 해상도 감지 (1080 너비와 높은 종횡비)
    const isFullHDScreen = width === breakpoints.fullHD && Dimensions.get('window').height >= 2000;

    // 화면 크기에 따라 동적으로 스타일 조정
    const getResponsiveStyles = () => {
        // 1080x2400 해상도에 대한 특별 처리
        if (isFullHDScreen) {
            return {
                container: {
                    padding: 22,
                },
                title: {
                    fontSize: 30,
                },
                subtitle: {
                    fontSize: 18,
                },
                card: {
                    width: '30%',
                },
                // 1080x2400 해상도에 최적화된 추가 스타일
                grid: {
                    columns: 3,
                },
                spacing: {
                    xs: 6,
                    sm: 12,
                    md: 18,
                    lg: 24,
                    xl: 36,
                },
            };
        } else if (isSmallScreen) {
            return {
                container: {
                    padding: 15,
                },
                title: {
                    fontSize: 24,
                },
                subtitle: {
                    fontSize: 16,
                },
                card: {
                    width: '100%',
                },
                // 기타 필요한 반응형 스타일
            };
        } else if (isMediumScreen) {
            return {
                container: {
                    padding: 20,
                },
                title: {
                    fontSize: 28,
                },
                subtitle: {
                    fontSize: 18,
                },
                card: {
                    width: '45%',
                },
            };
        } else {
            return {
                container: {
                    padding: 30,
                },
                title: {
                    fontSize: 32,
                },
                subtitle: {
                    fontSize: 20,
                },
                card: {
                    width: '22%',
                },
            };
        }
    };

    return {
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        isXLargeScreen,
        isFullHDScreen,
        responsiveStyles: getResponsiveStyles(),
    };
};
