/**
 * BillingCycleToggle — 결제 주기 세그먼트 (프레젠테이셔널).
 *
 * 월납 / 반년납 / 연납 세그먼트 컨트롤.
 *   - 반년납(HALF_YEARLY): "1개월 무료"
 *   - 연납(YEARLY): "2개월 무료"
 * 선택 세그먼트는 브랜드 accent, 비선택은 보조 텍스트 (다크 모드 안전).
 *
 * 순수 컴포넌트: props 로만 동작, API·네비게이션 없음.
 */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../../../common/components/ds';
import {radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

export type BillingCycleValue = 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY';

export interface BillingCycleToggleProps {
    value: BillingCycleValue;
    onChange: (v: BillingCycleValue) => void;
}

type Segment = {value: BillingCycleValue; label: string; discount?: string};

// 확정 할인: 반년납 1개월 무료, 연납 2개월 무료.
const SEGMENTS: Segment[] = [
    {value: 'MONTHLY', label: '월납'},
    {value: 'HALF_YEARLY', label: '반년납', discount: '1개월 무료'},
    {value: 'YEARLY', label: '연납', discount: '2개월 무료'},
];

export const BillingCycleToggle: React.FC<BillingCycleToggleProps> = ({value, onChange}) => {
    const c = useThemeColors();

    return (
        <View style={[styles.track, {backgroundColor: c.surfaceMuted}]} accessibilityRole="tablist">
            {SEGMENTS.map(seg => {
                const on = seg.value === value;
                return (
                    <Pressable
                        key={seg.value}
                        onPress={() => onChange(seg.value)}
                        accessibilityRole="tab"
                        accessibilityState={{selected: on}}
                        accessibilityLabel={seg.discount ? `${seg.label}, ${seg.discount}` : seg.label}
                        style={[styles.seg, on ? {backgroundColor: c.background, ...shadow.sm} : null]}>
                        <AppText
                            variant="caption"
                            numberOfLines={1}
                            style={[styles.label, {color: on ? c.brandPrimary : c.textSecondary}]}>
                            {seg.label}
                        </AppText>
                        {seg.discount ? (
                            <AppText
                                variant="caption"
                                numberOfLines={1}
                                style={[
                                    styles.discount,
                                    {color: on ? c.brandPrimary : c.textTertiary},
                                ]}>
                                {seg.discount}
                            </AppText>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        borderRadius: radius.xl,
        padding: 4,
        gap: 2,
    },
    seg: {
        flex: 1,
        minHeight: 48,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
    },
    label: {fontWeight: '800'},
    discount: {marginTop: 1, fontSize: 10, lineHeight: 13, fontWeight: '700'},
});

export default BillingCycleToggle;
