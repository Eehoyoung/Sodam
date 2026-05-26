/**
 * useResponsive — 소담 반응형 단일 진입점.
 *
 * 설계 근거: docs/05-design/launch-redesign/06-responsive-accessibility-qa.md
 *   - 브레이크포인트: compact(<360) / normal(360-430) / wide(431-767) / tablet(>=768)
 *   - 높이: compactHeight(<700) 에서 큰 원형 CTA·hero 축소
 *   - 금지: 화면 폭 기반 글자 크기 scaling (OS 텍스트 배율을 존중해야 접근성 보장)
 *   - 금지: 모듈 레벨 Dimensions.get() — 회전/폴더블 대응 위해 useWindowDimensions 사용
 *
 * 따라서 폰트는 비례 스케일 대신 pick() 으로 브레이크포인트별 이산 값을 고른다.
 * 간격·원형 지름 등 비텍스트 치수는 clamp() 로 유동 처리해도 된다.
 */
import {useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {breakpoints} from '../../theme/tokens';

export type Breakpoint = 'compact' | 'normal' | 'wide' | 'tablet';

export interface ResponsiveValues<T> {
    compact?: T;
    normal?: T;
    wide?: T;
    tablet?: T;
}

export interface Responsive {
    width: number;
    height: number;
    isLandscape: boolean;
    breakpoint: Breakpoint;
    isCompact: boolean;
    isNormal: boolean;
    isWide: boolean;
    isTablet: boolean;
    /** 세로 높이가 작은 기기 (작은 화면에서 hero/원형 CTA 축소 판단) */
    isCompactHeight: boolean;
    insets: {top: number; bottom: number; left: number; right: number};
    /** 브레이크포인트별 이산 값 선택. 누락 단계는 한 단계 아래 값으로 폴백. */
    pick: <T>(values: ResponsiveValues<T> & {default: T}) => T;
    /** 비텍스트 치수 유동 보간 (min ~ max, 폭 360→430 기준). 폰트에는 쓰지 말 것. */
    clamp: (min: number, max: number) => number;
}

const resolveBreakpoint = (width: number): Breakpoint => {
    if (width < breakpoints.compact) {
        return 'compact';
    }
    if (width <= breakpoints.normal) {
        return 'normal';
    }
    if (width <= breakpoints.wide) {
        return 'wide';
    }
    return 'tablet';
};

export const useResponsive = (): Responsive => {
    const {width, height} = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const breakpoint = resolveBreakpoint(width);
    const isCompact = breakpoint === 'compact';
    const isNormal = breakpoint === 'normal';
    const isWide = breakpoint === 'wide';
    const isTablet = breakpoint === 'tablet';

    const pick = <T,>(values: ResponsiveValues<T> & {default: T}): T => {
        // 요청 브레이크포인트부터 아래로 폴백 (tablet→wide→normal→compact→default)
        const order: Breakpoint[] = ['compact', 'normal', 'wide', 'tablet'];
        const idx = order.indexOf(breakpoint);
        for (let i = idx; i >= 0; i--) {
            const v = values[order[i]];
            if (v !== undefined) {
                return v;
            }
        }
        // 위쪽(더 큰) 단계도 탐색해 누락 시 가장 가까운 값 사용
        for (let i = idx + 1; i < order.length; i++) {
            const v = values[order[i]];
            if (v !== undefined) {
                return v;
            }
        }
        return values.default;
    };

    const clamp = (min: number, max: number): number => {
        const lo = breakpoints.compact;   // 360
        const hi = breakpoints.normal;    // 430
        if (width <= lo) {
            return min;
        }
        if (width >= hi) {
            return max;
        }
        const t = (width - lo) / (hi - lo);
        return Math.round(min + (max - min) * t);
    };

    return {
        width,
        height,
        isLandscape: width > height,
        breakpoint,
        isCompact,
        isNormal,
        isWide,
        isTablet,
        isCompactHeight: height < breakpoints.compactHeight,
        insets,
        pick,
        clamp,
    };
};

export default useResponsive;
