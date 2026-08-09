import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppButton, AppText, BottomSheet} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import type {PaymentReceipt} from '../services/subscriptionApi';

interface Props {
    visible: boolean;
    receipts: PaymentReceipt[];
    submitting: boolean;
    onClose: () => void;
    onRequest: (receipt: PaymentReceipt) => void;
}

const sourceLabel: Record<PaymentReceipt['sourceType'], string> = {
    SUBSCRIPTION: '구독',
    ATTENDANCE_CREDIT_CHARGE: '출근권 충전',
    RECRUITMENT_BOOST_PASS: '채용 부스트 패스',
    TAX_SERVICE: '세무 서비스',
};

/** 결제 원본을 서버 영수 상태에서만 보여 주므로 금액·주문번호 위변조 없이 환불을 신청한다. */
const PaymentRefundSheet: React.FC<Props> = ({visible, receipts, submitting, onClose, onRequest}) => (
    <BottomSheet visible={visible} onClose={onClose} title="결제 내역과 환불" description="환불 기준 확인 전에는 실결제 환불을 접수만 해요.">
        <View style={styles.list}>
            {receipts.length === 0 ? <AppText variant="bodyMd" tone="secondary">환불 가능한 결제 내역이 없어요.</AppText> : null}
            {receipts.filter(r => r.status !== 'CANCELLED').map(receipt => (
                <View key={`${receipt.sourceType}-${receipt.orderId}`} style={styles.row}>
                    <View style={styles.copy}>
                        <AppText variant="bodyMd" weight="700">{sourceLabel[receipt.sourceType]}</AppText>
                        <AppText variant="caption" tone="secondary">{receipt.amountKrw.toLocaleString('ko-KR')}원</AppText>
                    </View>
                    <AppButton label="환불 신청" size="sm" variant="outline" loading={submitting} onPress={() => onRequest(receipt)} />
                </View>
            ))}
        </View>
    </BottomSheet>
);

const styles = StyleSheet.create({list: {gap: spacing.sm}, row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, copy: {flex: 1, gap: 2}});
export default PaymentRefundSheet;
