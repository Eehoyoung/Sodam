/**
 * PunchButton — 직원 출근/퇴근용 대형 원형 CTA (확정 시안 .punch).
 *
 * (08 §17 EmployeeAttendanceHome) 근무 중에는 타이머가 최상위 정보.
 * 반응형: 폭/높이 compact 에서 축소 (min 176 ~ max 220).
 * 상태색: idle=brand, working=amber.
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../../theme/tokens';
import {useResponsive} from '../../hooks/useResponsive';

interface PunchButtonProps {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    state?: 'idle' | 'working';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

const COLORS: Record<'idle' | 'working', [string, string]> = {
    idle: [colors.brandPrimary, '#FF8954'],
    working: [colors.warning, '#FFBA45'],
};

export const PunchButton: React.FC<PunchButtonProps> = ({
    title,
    subtitle,
    onPress,
    state = 'idle',
    disabled = false,
    style,
    testID,
}) => {
    const {clamp, isCompactHeight} = useResponsive();
    // compact 높이에서 축소
    const size = isCompactHeight ? 176 : clamp(184, 220);

    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
            accessibilityState={{disabled}}
            style={({pressed}) => [styles.wrap, pressed && !disabled ? styles.pressed : null, style]}>
            <LinearGradient
                colors={COLORS[state]}
                start={{x: 0.2, y: 0.1}}
                end={{x: 1, y: 1}}
                style={[styles.circle, {width: size, height: size, borderRadius: size / 2}]}>
                <View style={styles.inner}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
            </LinearGradient>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    wrap: {alignItems: 'center', justifyContent: 'center', alignSelf: 'center'},
    pressed: {opacity: 0.95, transform: [{scale: 0.97}]},
    circle: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.brandPrimary,
        shadowOffset: {width: 0, height: 20},
        shadowOpacity: 0.32,
        shadowRadius: 40,
        elevation: 10,
    },
    inner: {alignItems: 'center', paddingHorizontal: 16},
    title: {color: colors.textInverse, fontSize: 26, fontWeight: '900', textAlign: 'center'},
    subtitle: {marginTop: 8, color: '#FFE3D7', fontSize: 12, fontWeight: '800', textAlign: 'center'},
});

export default PunchButton;
