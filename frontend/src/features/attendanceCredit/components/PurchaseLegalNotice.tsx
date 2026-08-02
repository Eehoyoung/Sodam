import React from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppCard, AppText} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 출근권 충전소 / 무제한 패스 구매 화면 공통 법정 고지 — 결제(청약철회)·유효기간 안내
 * (recruitment-monetization-gamification-plan.md §12 — legal-terms-reviewer 3자 교차검증 결과 반영).
 *
 * <p><b>왜 각주가 아니라 카드인가</b>: 법무 검토가 "작은 별표 각주 방식은 표시의무 위반 리스크"라고
 * 명시했다 — 결제 버튼과 같은 화면에서 본문 크기(bodySm, tone=secondary가 아닌 primary)로 노출한다.
 * 이 컴포넌트는 두 화면(충전소/무제한 패스)에서 문구만 다르고 레이아웃은 동일해 공용으로 뺐다 —
 * 문구를 화면마다 따로 손으로 맞추면 한쪽만 고치고 다른 쪽을 놓치는 드리프트가 생기기 쉽다.</p>
 */
interface Props {
    /** 'charge' = 출근권 충전소, 'boostPass' = 무제한 패스 — 두 상품의 청약철회 조건이 달라 문구를 분기한다. */
    variant: 'charge' | 'boostPass';
}

const CHARGE_BULLETS = [
    '본 상품은 결제 즉시 지급되는 디지털 재화(출근권)예요.',
    '미사용 수량에 한해 구매일로부터 7일 이내 청약철회(환불) 신청이 가능해요. 단, 이미 사용(채용 제안 발송·지원서 열람에 소모)한 수량은 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조에 따라 청약철회가 제한될 수 있어요.',
    '유료로 구매한 출근권은 유효기간이 없어요. 무료로 지급된 출근권(출석체크 보상 등)은 지급일로부터 30일간 유효하며, 이후 자동 소멸해요.',
    '출근권은 채용 매칭 기능(제안 발송·지원서 열람)에 쓰는 재화로, 직원 출퇴근 기록(근태 관리)과는 별개예요.',
    '환불(청약철회) 신청은 고객센터로 문의해 주세요.',
];

const BOOST_PASS_BULLETS = [
    '본 상품은 결제 승인 시점부터 이용기간이 즉시 시작돼요.',
    '미사용 잔여 기간에 한해 구매일로부터 7일 이내 청약철회(환불) 신청이 가능해요. 이용을 개시한 기간에 대해서는 환불이 제한될 수 있어요.',
    '환불(청약철회) 신청은 고객센터로 문의해 주세요.',
];

const PurchaseLegalNotice: React.FC<Props> = ({variant}) => {
    const c = useThemeColors();
    const bullets = variant === 'charge' ? CHARGE_BULLETS : BOOST_PASS_BULLETS;

    return (
        <AppCard variant="flat" style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="information-circle-outline" size={18} color={c.textSecondary} />
                <AppText variant="bodyMd" weight="700">구매 전 꼭 확인해 주세요</AppText>
            </View>
            <View style={styles.list}>
                {bullets.map(line => (
                    <View key={line} style={styles.row}>
                        <AppText variant="bodyMd" tone="secondary" style={styles.bullet}>•</AppText>
                        <AppText variant="bodyMd" tone="secondary" style={styles.rowText}>{line}</AppText>
                    </View>
                ))}
            </View>
        </AppCard>
    );
};

const styles = StyleSheet.create({
    card: {gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl},
    header: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    list: {gap: spacing.xs},
    row: {flexDirection: 'row', gap: spacing.xs},
    bullet: {width: 12},
    rowText: {flex: 1},
});

export default PurchaseLegalNotice;
