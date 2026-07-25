/**
 * 72 PlanDetail — 플랜 상세 시트.
 * SubscriptionPlanCard 가 이미 들고 있는 PlanCardView 데이터를 그대로 재사용해서 보여준다.
 * 신규 API/데이터 없음 — "이 플랜 사용하기" 는 기존 SubscribeScreen 의 플랜 선택(onSelect) 그대로 위임.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppBadge, AppCard, AppText, BottomSheet} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import type {PlanCardView} from './SubscriptionPlanCard';

interface Props {
    visible: boolean;
    onClose: () => void;
    view: PlanCardView | null;
    /** 이 플랜 사용하기 — 기존 플랜 선택 로직(setSelectedPlan) 위임, 신규 로직 없음 */
    onSelect: () => void;
}

export const PlanDetailSheet: React.FC<Props> = ({visible, onClose, view, onSelect}) => {
    if (!view) {
        return null;
    }
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={`${view.displayName} 플랜`}
            scrollable
            primary={{label: '이 플랜 사용하기', onPress: onSelect}}
            secondary={{label: '닫기', variant: 'ghost', onPress: onClose}}>
            <View style={styles.body}>
                <AppCard variant="spot" style={styles.priceCard}>
                    <AppText variant="headingSm" tone="brand">{view.priceLabel}</AppText>
                    {view.recommended ? (
                        <AppText variant="caption" tone="secondary" style={styles.recommendedNote}>
                            대부분의 사장님이 선택하는 플랜이에요.
                        </AppText>
                    ) : null}
                </AppCard>

                {view.highlights.map((h, idx) => (
                    <View key={idx} style={styles.row}>
                        <AppText variant="bodyMd" tone={h.included ? 'primary' : 'tertiary'} style={styles.rowText}>
                            {h.text}
                        </AppText>
                        <AppBadge label={h.included ? '포함' : '미포함'} tone={h.included ? 'success' : 'neutral'} />
                    </View>
                ))}
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    body: {gap: spacing.sm, paddingBottom: spacing.sm},
    priceCard: {marginBottom: spacing.sm},
    recommendedNote: {marginTop: spacing.xs},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md},
    rowText: {flex: 1},
});

export default PlanDetailSheet;
