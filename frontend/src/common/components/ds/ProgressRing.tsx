/**
 * ProgressRing — 진행률 링 (v3 "링 & 패스" 시그니처, docs/260720 계획서 WP-02).
 * 코랄(시작)→틸(마감) 그라디언트로 시간이 채워지는 원형 게이지.
 * `PunchButton`이 내부적으로 이 컴포넌트를 사용한다.
 */
import React, {useRef} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import {useThemeColors, useV3Colors} from '../../hooks/useThemeColors';

interface ProgressRingProps {
    /** 0~1 진행률. 시간 정보가 없으면 1(풀링 장식)로 호출부에서 기본값 처리 */
    progress: number;
    size?: number;
    strokeWidth?: number;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

let ringGradientSeq = 0;

export const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    size = 148,
    strokeWidth = 10,
    children,
    style,
    testID,
}) => {
    const c = useThemeColors();
    const v3 = useV3Colors();
    const gradientId = useRef(`progressRingGradient_${ringGradientSeq++}`).current;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(1, progress));
    const dashOffset = circumference * (1 - clamped);

    return (
        <View testID={testID} style={[{width: size, height: size}, style]}>
            <Svg width={size} height={size} style={styles.svgLayer}>
                <Defs>
                    <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={v3.coral} />
                        <Stop offset="100%" stopColor={v3.teal} />
                    </LinearGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.border} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    fill="none"
                    rotation={-90}
                    originX={size / 2}
                    originY={size / 2}
                />
            </Svg>
            <View style={[{width: size, height: size}, styles.center]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    svgLayer: {position: 'absolute'},
    center: {alignItems: 'center', justifyContent: 'center'},
});

export default ProgressRing;
