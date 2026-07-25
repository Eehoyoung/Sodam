/**
 * PunchButton — 직원 출근/퇴근용 대형 원형 CTA.
 * v3 "링 & 패스"(docs/260720 계획서) — 코랄→틸 그라디언트 ProgressRing으로 재구현.
 * 외부 API는 v2 시절과 최대한 동일하게 유지해 호출부 영향을 최소화했다(progress만 신규 옵션).
 *
 * 반응형: 폭/높이 compact 에서 축소 (min 176 ~ max 220).
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useResponsive} from '../../hooks/useResponsive';
import {useThemeColors} from '../../hooks/useThemeColors';
import {ProgressRing} from './ProgressRing';

interface PunchButtonProps {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    state?: 'idle' | 'working';
    /** 0~1, 근무 경과 비율(예: elapsedMs / 8h). 미지정 시 idle=0, working=장식용 0.5 */
    progress?: number;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const PunchButton: React.FC<PunchButtonProps> = ({
    title,
    subtitle,
    onPress,
    state = 'idle',
    progress,
    disabled = false,
    style,
    testID,
}) => {
    const {clamp, isCompactHeight} = useResponsive();
    const c = useThemeColors();
    // compact 높이에서 축소
    const size = isCompactHeight ? 176 : clamp(184, 220);
    const resolvedProgress = progress ?? (state === 'working' ? 0.5 : 0);

    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
            accessibilityState={{disabled}}
            style={({pressed}) => [styles.wrap, pressed && !disabled ? styles.pressed : null, style]}>
            <ProgressRing progress={resolvedProgress} size={size} strokeWidth={Math.round(size * 0.045)}>
                <View style={styles.inner}>
                    <Text style={[styles.title, {color: c.textPrimary}]}>{title}</Text>
                    {subtitle ? <Text style={[styles.subtitle, {color: c.textSecondary}]}>{subtitle}</Text> : null}
                </View>
            </ProgressRing>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    wrap: {alignItems: 'center', justifyContent: 'center', alignSelf: 'center'},
    pressed: {opacity: 0.95, transform: [{scale: 0.97}]},
    inner: {alignItems: 'center', paddingHorizontal: 16},
    title: {fontSize: 22, fontWeight: '800', textAlign: 'center'},
    subtitle: {marginTop: 8, fontSize: 12, fontWeight: '700', textAlign: 'center'},
});

export default PunchButton;
