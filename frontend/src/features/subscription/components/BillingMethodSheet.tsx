/**
 * 71 Billing Method Sheet (확정 시안).
 * ⚠️ CLAUDE.md 금지: 카드번호 직접 저장 금지 — 토스 빌링키만.
 *   따라서 raw 카드 입력을 받지 않고, 현재 수단 표시 + 토스 빌링 관리로 위임한다.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

interface Props {
    visible: boolean;
    onClose: () => void;
    /** 마스킹된 현재 결제 수단 (예: "카드 ****4821") */
    currentMethod?: string;
    nextBillingDate?: string;
    /** 토스 빌링키 등록/변경 플로우로 이동 (PG 위임) */
    onManageViaToss: () => void;
}

export const BillingMethodSheet: React.FC<Props> = ({visible, onClose, currentMethod, nextBillingDate, onManageViaToss}) => (
    <BottomSheet
        visible={visible}
        onClose={onClose}
        title="결제 수단"
        description="카드 정보는 소담에 저장되지 않아요. 토스페이먼츠에서 안전하게 관리돼요."
        primary={{label: '결제 수단 변경', onPress: onManageViaToss}}
        secondary={{label: '닫기', variant: 'ghost', onPress: onClose}}>
        <View style={styles.box}>
            <AppText variant="caption" tone="secondary">현재 결제 수단</AppText>
            <AppText variant="titleMd" style={styles.method}>{currentMethod ?? '등록된 수단 없음'}</AppText>
            {nextBillingDate ? (
                <AppText variant="caption" tone="tertiary" style={styles.next}>다음 결제 {nextBillingDate}</AppText>
            ) : null}
        </View>
    </BottomSheet>
);

const styles = StyleSheet.create({
    box: {marginTop: spacing.xs},
    method: {marginTop: 2},
    next: {marginTop: 4},
});

export default BillingMethodSheet;
