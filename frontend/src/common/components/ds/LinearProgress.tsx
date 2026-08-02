/**
 * LinearProgress — 수평 진행률 바 (v3 시그니처 코랄→틸 그라디언트, `ProgressRing`의 선형 버전).
 *
 * 진행률(0~1)을 트랙 위 그라디언트 채움으로 표시한다 — 구직 설정 자격조건 진행률처럼 "몇 개
 * 남았는지"를 즉시 보여줘야 하는 화면에 사용(recruitment-monetization-gamification-plan.md §6.1).
 */
import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {gradient as gradientTokens} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface LinearProgressProps {
    /** 0~1 진행률(범위를 벗어나면 clamp). */
    progress: number;
    height?: number;
    /** 기본 gradient.ring(코랄→틸, ProgressRing 과 동일 시그니처). */
    colors?: [string, string];
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
    progress,
    height = 8,
    colors,
    style,
    testID,
}) => {
    const c = useThemeColors();
    const clamped = Math.max(0, Math.min(1, progress));
    return (
        <View
            testID={testID}
            accessibilityRole="progressbar"
            accessibilityValue={{min: 0, max: 100, now: Math.round(clamped * 100)}}
            style={[
                styles.track,
                {height, borderRadius: height / 2, backgroundColor: c.surfaceMuted},
                style,
            ]}>
            <LinearGradient
                colors={colors ?? gradientTokens.ring}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.fill, {width: `${clamped * 100}%`, borderRadius: height / 2}]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    track: {width: '100%', overflow: 'hidden'},
    fill: {height: '100%'},
});

export default LinearProgress;
