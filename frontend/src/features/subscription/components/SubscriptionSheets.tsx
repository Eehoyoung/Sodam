/**
 * 구독 관리 시트 — 해지 확인 / 다운그레이드 확인 (갭분석 추가 A3·A4).
 * ⚠️ 표현/안내만 — 실제 해지·결제 트리거는 호출 측 핸들러(PG 로직 불변).
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet} from '../../../common/components/ds';
import {colors, spacing} from '../../../theme/tokens';

interface CancelProps {
    visible: boolean;
    onClose: () => void;
    onConfirmCancel: () => void;
    onDowngradeInstead?: () => void;
    /** 해지 시 잃는 기능 목록 */
    losing?: string[];
}

export const CancelSubscriptionSheet: React.FC<CancelProps> = ({
    visible,
    onClose,
    onConfirmCancel,
    onDowngradeInstead,
    losing = ['급여명세 발급', '직원 알림', '정산 준비율'],
}) => (
    <BottomSheet
        visible={visible}
        onClose={onClose}
        title="정말 해지하시겠어요?"
        description="해지하면 다음 기능을 더 이상 쓸 수 없어요. 결제는 이번 주기까지 유지돼요."
        primary={{label: '해지하기', variant: 'destructive', onPress: onConfirmCancel}}
        secondary={onDowngradeInstead ? {label: '베이직으로 낮추기', onPress: onDowngradeInstead} : {label: '계속 사용', onPress: onClose}}>
        <View style={styles.list}>
            {losing.map(f => (
                <View key={f} style={styles.row}>
                    <AppText style={styles.dash}>–</AppText>
                    <AppText variant="bodyMd" tone="secondary">{f}</AppText>
                </View>
            ))}
        </View>
    </BottomSheet>
);

interface DowngradeProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    effectiveDate?: string;
}

export const DowngradeConfirmSheet: React.FC<DowngradeProps> = ({visible, onClose, onConfirm, effectiveDate}) => (
    <BottomSheet
        visible={visible}
        onClose={onClose}
        title="베이직으로 변경할까요?"
        description={`다음 결제일${effectiveDate ? `(${effectiveDate})` : ''}부터 베이직 플랜이 적용돼요. 그때까지는 비즈니스 기능을 그대로 쓸 수 있어요.`}
        primary={{label: '베이직으로 변경', onPress: onConfirm}}
        secondary={{label: '취소', variant: 'ghost', onPress: onClose}}>
        <View style={styles.keep}>
            <AppText variant="caption" tone="secondary">유지: 기본 근태 · 급여 자동 계산</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.lose}>빠짐: 명세서 발급 · 직원 알림</AppText>
        </View>
    </BottomSheet>
);

const styles = StyleSheet.create({
    list: {gap: spacing.xs, marginTop: spacing.xs},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    dash: {color: colors.error, fontWeight: '900', width: 16},
    keep: {marginTop: spacing.xs, gap: 2},
    lose: {},
});

export default {CancelSubscriptionSheet, DowngradeConfirmSheet};
