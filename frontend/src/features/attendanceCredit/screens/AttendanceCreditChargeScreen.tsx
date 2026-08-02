import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    LoadingState,
    ScreenContainer,
    AppToast,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {isTossLive} from '../../../common/config/env';
import attendanceCreditApi, {AttendanceCreditChargeCatalog, AttendanceCreditChargePack} from '../services/attendanceCreditApi';
// 잔액/소멸예정 요약은 Phase A/B가 이미 소유한 서비스·타입을 재사용한다(중복/드리프트 방지 — CLAUDE.md 원칙).
import attendanceCreditService from '../../recruitment/services/attendanceCreditService';
import type {AttendanceCreditSummary} from '../../recruitment/types';
import PurchaseLegalNotice from '../components/PurchaseLegalNotice';

/**
 * 출근권 충전소 — 사장 전용 IAP 화면(recruitment-monetization-gamification-plan.md §2.4).
 *
 * 잔액 카드 + 이번 주 소멸 예정 배너 + 4개 상품 카드(스몰/미디엄/라지/스트릭 복구권) + 결제 진행.
 * 결제는 기존 구독 화면(SubscribeScreen → TossBillingAuth)과 동일한 WebView 패턴을 1회성 결제
 * 버전(AttendanceCreditChargePaymentScreen)으로 그대로 따른다 — 새 결제 UI 패턴을 발명하지 않는다.
 */
export interface AttendanceCreditChargeVisualFixture {
    summary: AttendanceCreditSummary;
    catalog: AttendanceCreditChargeCatalog;
}

interface Props {
    /** 개발용 시각 검증 전용 — API 호출을 건너뛰고 고정 데이터를 표시한다. */
    visualFixture?: AttendanceCreditChargeVisualFixture;
}

function iconFor(code: AttendanceCreditChargePack['code']): string {
    switch (code) {
        case 'SMALL': return 'flash-outline';
        case 'MEDIUM': return 'flame-outline';
        case 'LARGE': return 'trophy-outline';
        case 'STREAK_RECOVERY': return 'shield-checkmark-outline';
        default: return 'pricetag-outline';
    }
}

function formatWon(n: number): string {
    return `${n.toLocaleString('ko-KR')}원`;
}

const AttendanceCreditChargeScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();

    const [summary, setSummary] = useState<AttendanceCreditSummary | null>(visualFixture?.summary ?? null);
    const [catalog, setCatalog] = useState<AttendanceCreditChargeCatalog | null>(visualFixture?.catalog ?? null);
    const [loading, setLoading] = useState(!visualFixture);
    const [purchasingCode, setPurchasingCode] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        setLoading(true);
        try {
            const [summaryRes, catalogRes] = await Promise.all([
                attendanceCreditService.getMySummary(),
                attendanceCreditApi.getChargeCatalog(),
            ]);
            setSummary(summaryRes);
            setCatalog(catalogRes);
        } catch {
            AppToast.error('충전소 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [visualFixture]);

    // 결제 화면에서 돌아왔을 때(성공/실패 무관) 잔액이 최신인지 다시 확인 — 쓰기 후 목록 갱신 패턴.
    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const handlePurchase = async (pack: AttendanceCreditChargePack) => {
        if (!isTossLive()) {
            AppToast.show('유료 결제는 준비 중이에요. 곧 만나요!');
            return;
        }
        setPurchasingCode(pack.code);
        try {
            const order = await attendanceCreditApi.createChargeOrder(pack.code);
            navigation.navigate('AttendanceCreditChargePayment', {
                orderId: order.orderId,
                amountKrw: order.amountKrw,
                orderName: order.orderName,
            });
        } catch (e: unknown) {
            const message =
                (e as {response?: {data?: {message?: string}}})?.response?.data?.message ??
                '주문 생성에 실패했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(message);
        } finally {
            setPurchasingCode(null);
        }
    };

    const renderPack = (pack: AttendanceCreditChargePack) => {
        // promoCopyEnabled 는 서버 스위치로 아직 꺼져 있다(AttendanceCreditProperties.Charge 참고).
        // 이 스위치를 켜서 배지를 노출하는 시점에는, 조건 문구(1인 1회 한정·재화가 포함된 결제만
        // 해당·스트릭 복구권 단독구매 제외)를 이 배지와 동일한 가시성으로 함께 표시해야 한다
        // (법무검토 2026-08-03 참고 — 작은 각주로 숨기지 말 것). 지금은 배지 자체가 안 뜨니 무해하다.
        const showBonusBadge =
            catalog?.promoCopyEnabled &&
            catalog?.firstPurchaseBonusAvailable &&
            pack.creditQuantity > 0; // 스트릭 복구권(단품)은 보너스 대상이 아님

        return (
            <AppCard key={pack.code} variant={pack.popular ? 'spot' : 'flat'} style={styles.packCard}>
                <View style={styles.packHeader}>
                    <View style={[styles.packIconWrap, {backgroundColor: c.brandPrimarySoft}]}>
                        <Ionicons name={iconFor(pack.code)} size={22} color={c.brandPrimary} />
                    </View>
                    <View style={styles.packTitleBlock}>
                        <View style={styles.packTitleRow}>
                            <AppText variant="titleMd" weight="700">{pack.displayName}</AppText>
                            {pack.popular ? <AppBadge label="가장 인기" tone="warning" /> : null}
                            {showBonusBadge ? <AppBadge label={`첫구매 ${catalog?.firstPurchaseBonusMultiplier ?? 2}배`} tone="success" /> : null}
                        </View>
                        <AppText variant="caption" tone="secondary">
                            {pack.creditQuantity > 0
                                ? `출근권 ${pack.creditQuantity.toLocaleString('ko-KR')}개`
                                : '스트릭 보호 1회권'}
                        </AppText>
                    </View>
                </View>

                <View style={styles.packFooter}>
                    <AppText variant="headingSm" tone="brand">{formatWon(pack.priceKrw)}</AppText>
                    <AppButton
                        label="구매하기"
                        size="sm"
                        loading={purchasingCode === pack.code}
                        disabled={purchasingCode !== null && purchasingCode !== pack.code}
                        onPress={() => handlePurchase(pack)}
                    />
                </View>
            </AppCard>
        );
    };

    if (loading && !summary) {
        return (
            <ScreenContainer header={<AppHeader title="출근권 충전소" onBack={() => navigation.goBack()} />}>
                <LoadingState title="충전소를 불러오는 중" description="잠시만 기다려 주세요…" />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="출근권 충전소" onBack={() => navigation.goBack()} />}>
            <SegmentedControl
                options={['충전소', '무제한 패스']}
                value={0}
                onChange={index => {
                    if (index === 1) {
                        navigation.navigate('RecruitmentBoostPass');
                    }
                }}
                style={styles.tabs}
            />
            <AppCard variant="spot" style={styles.balanceCard}>
                <AppText variant="caption" tone="secondary" weight="700">내 출근권 잔액</AppText>
                <AppText variant="headingLg" tone="brand" style={styles.balanceValue}>
                    {(summary?.balance ?? 0).toLocaleString('ko-KR')}개
                </AppText>
                {summary && summary.expiringThisWeek > 0 ? (
                    <View style={[styles.expiringBanner, {backgroundColor: c.warningBg}]}>
                        <Ionicons name="time-outline" size={16} color={c.warning} />
                        <AppText variant="caption" weight="700" style={{color: c.warning}}>
                            이번 주 {summary.expiringThisWeek}개 소멸 예정이에요
                        </AppText>
                    </View>
                ) : null}
            </AppCard>

            <AppText variant="headingSm" style={styles.sectionTitle}>충전 상품</AppText>
            <View style={styles.list}>
                {(catalog?.packs ?? []).map(renderPack)}
            </View>

            <PurchaseLegalNotice variant="charge" />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    tabs: {marginBottom: spacing.lg},
    balanceCard: {marginBottom: spacing.xl, gap: spacing.xs},
    balanceValue: {marginTop: 2},
    expiringBanner: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: 999, alignSelf: 'flex-start',
    },
    sectionTitle: {marginBottom: spacing.md},
    list: {gap: spacing.md},
    packCard: {gap: spacing.md},
    packHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
    packIconWrap: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    packTitleBlock: {flex: 1, gap: 2},
    packTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap'},
    packFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
});

export default AttendanceCreditChargeScreen;
