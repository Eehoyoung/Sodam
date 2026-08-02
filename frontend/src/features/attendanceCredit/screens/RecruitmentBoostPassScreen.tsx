import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    LoadingState,
    ScreenContainer,
    AppToast,
    SegmentedControl,
} from '../../../common/components/ds';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {isTossLive} from '../../../common/config/env';
import recruitmentBoostPassApi, {
    RecruitmentBoostPassProduct,
    RecruitmentBoostPassSummary,
} from '../services/recruitmentBoostPassApi';
import PurchaseLegalNotice from '../components/PurchaseLegalNotice';

/**
 * 채용 부스트 무제한 패스 — 사장 전용 애드온 구매 화면(recruitment-monetization-gamification-plan.md
 * §2.5). 목업: `docs/260801/recruitment-design-artifacts.html`의 "🎟️ 무제한 패스" 탭.
 *
 * 기존 매장 정기구독(`features/subscription`)과는 완전히 별개 트랙이다(번들링하지 않는다) — 이
 * 화면은 사장 개인(User) 단위 3/7/30일 기간제 상품이다. 진입점은 출근권 충전소
 * (`AttendanceCreditChargeScreen`) 옆의 세그먼트 탭 전환이다.
 */
export interface RecruitmentBoostPassVisualFixture {
    summary: RecruitmentBoostPassSummary;
}

interface Props {
    /** 개발용 시각 검증 전용 — API 호출을 건너뛰고 고정 데이터를 표시한다. */
    visualFixture?: RecruitmentBoostPassVisualFixture;
}

function formatWon(n: number): string {
    return `${n.toLocaleString('ko-KR')}원`;
}

function perDayWon(priceKrw: number, durationDays: number): string {
    if (durationDays <= 0) {
        return '';
    }
    return `하루 ${Math.round(priceKrw / durationDays).toLocaleString('ko-KR')}원꼴`;
}

function productDesc(code: RecruitmentBoostPassProduct['code']): string {
    switch (code) {
        case 'THREE_DAY':
            return '급하게 여러 명 채용할 때';
        case 'SEVEN_DAY':
            return '상시채용 매장에 가장 잘 맞는 구간';
        case 'THIRTY_DAY':
            return '다점포·상시채용 사장님용';
        default:
            return '';
    }
}

const RecruitmentBoostPassScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();

    const [summary, setSummary] = useState<RecruitmentBoostPassSummary | null>(visualFixture?.summary ?? null);
    const [loading, setLoading] = useState(!visualFixture);
    const [purchasingCode, setPurchasingCode] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        setLoading(true);
        try {
            const res = await recruitmentBoostPassApi.getMe();
            setSummary(res);
        } catch {
            AppToast.error('무제한 패스 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [visualFixture]);

    // 결제 화면에서 돌아왔을 때(성공/실패 무관) 상태가 최신인지 다시 확인 — 쓰기 후 목록 갱신 패턴.
    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const handlePurchase = async (product: RecruitmentBoostPassProduct) => {
        if (!isTossLive()) {
            AppToast.show('유료 결제는 준비 중이에요. 곧 만나요!');
            return;
        }
        setPurchasingCode(product.code);
        try {
            const order = await recruitmentBoostPassApi.createOrder(product.code);
            navigation.navigate('RecruitmentBoostPassPayment', {
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

    // 패스는 특정 상품이 아니라 "만료 시각" 하나로만 보유하는 모델이라(스택형 연장, §2.5 RecruitmentBoostPass
    // 클래스 주석 참고), 어느 카드가 "지금 이 패스를 만든 상품"인지는 서버가 보존하지 않는다 — 그래서
    // 상품 카드마다 "구독중" 배지를 개별 판정하지 않고, 활성 상태는 위 히어로 카드(D-day) 하나로만
    // 보여준다. 카드의 CTA 문구만 활성 여부에 따라 "구독하기"/"구독 연장하기"로 통일해서 바꾼다.
    const renderProduct = (product: RecruitmentBoostPassProduct) => {
        const active = summary?.active ?? false;

        return (
            <AppCard key={product.code} variant="flat" style={styles.productCard}>
                <View style={styles.productTop}>
                    <AppText variant="titleMd" weight="700">{product.displayName}</AppText>
                </View>
                <AppText variant="headingSm" style={{color: recruit.primaryPressed}}>{formatWon(product.priceKrw)}</AppText>
                <AppText variant="caption" tone="secondary">
                    {productDesc(product.code)} — {perDayWon(product.priceKrw, product.durationDays)}
                </AppText>
                <AppButton
                    label={active ? '구독 연장하기' : '구독하기'}
                    size="sm"
                    loading={purchasingCode === product.code}
                    disabled={purchasingCode !== null && purchasingCode !== product.code}
                    onPress={() => handlePurchase(product)}
                    style={styles.productCta}
                />
            </AppCard>
        );
    };

    if (loading && !summary) {
        return (
            <ScreenContainer header={<AppHeader title="채용 부스트 · 무제한 패스" onBack={() => navigation.goBack()} />}>
                <LoadingState title="정보를 불러오는 중" description="잠시만 기다려 주세요…" />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="채용 부스트 · 무제한 패스" onBack={() => navigation.goBack()} />}>
            <SegmentedControl
                options={['충전소', '무제한 패스']}
                value={1}
                onChange={index => {
                    if (index === 0) {
                        navigation.navigate('AttendanceCreditCharge');
                    }
                }}
                style={styles.tabs}
            />

            {summary?.active ? (
                <AppCard variant="spot" style={styles.heroCard}>
                    <AppText variant="caption" tone="secondary" weight="700">현재 이용중</AppText>
                    <AppText variant="headingLg" tone="brand" style={styles.heroValue}>
                        D-{summary.remainingDays}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                        기간 동안 제안 발송·지원서 열람+채팅이 출근권 소모 없이 무제한이에요.
                    </AppText>
                </AppCard>
            ) : (
                <AppText variant="bodyMd" tone="secondary" style={styles.lede}>
                    기간 동안 제안 발송·지원서 열람+채팅이 출근권 소모 없이 무제한! 공고도 상단에 고정돼요.
                </AppText>
            )}

            <View style={styles.list}>
                {(summary?.products ?? []).map(renderProduct)}
            </View>

            <PurchaseLegalNotice variant="boostPass" />

            <AppCard variant="flat" style={styles.compareCard}>
                <AppText variant="titleMd" weight="700" style={styles.compareTitle}>어떤 게 더 유리할까요?</AppText>
                <View style={styles.compareRow}>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>기준</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>출근권(종량제)</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>무제한 패스</AppText>
                </View>
                <View style={[styles.compareRow, {borderTopColor: c.border, borderTopWidth: StyleSheetHairline}]}>
                    <AppText variant="caption" style={styles.compareCell}>월 3~4건 채용</AppText>
                    <AppText variant="caption" weight="700" style={styles.compareCell}>더 저렴</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>-</AppText>
                </View>
                <View style={[styles.compareRow, {borderTopColor: c.border, borderTopWidth: StyleSheetHairline}]}>
                    <AppText variant="caption" style={styles.compareCell}>월 10건 이상</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>-</AppText>
                    <AppText variant="caption" weight="700" style={styles.compareCell}>더 저렴</AppText>
                </View>
                <View style={[styles.compareRow, {borderTopColor: c.border, borderTopWidth: StyleSheetHairline}]}>
                    <AppText variant="caption" style={styles.compareCell}>상단 노출</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.compareCell}>없음</AppText>
                    <AppText variant="caption" weight="700" style={styles.compareCell}>포함</AppText>
                </View>
            </AppCard>
        </ScreenContainer>
    );
};

// 세로 1px 구분선 — 다른 화면에서도 쓰는 하드코딩 1이 아니라 플랫폼 hairline 값을 쓰고 싶지만
// StyleSheet.hairlineWidth 를 import 하지 않은 파일이 많아 이 화면 지역 상수로 둔다.
const StyleSheetHairline = 1;

const styles = StyleSheet.create({
    tabs: {marginBottom: spacing.lg},
    heroCard: {marginBottom: spacing.xl, gap: spacing.xs},
    heroValue: {marginTop: 2},
    lede: {marginBottom: spacing.xl},
    list: {gap: spacing.md, marginBottom: spacing.xl},
    productCard: {gap: spacing.xs},
    productTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    productCta: {marginTop: spacing.sm},
    compareCard: {gap: spacing.sm, marginBottom: spacing.xl},
    compareTitle: {marginBottom: spacing.xs},
    compareRow: {flexDirection: 'row', paddingVertical: spacing.xs},
    compareCell: {flex: 1},
});

export default RecruitmentBoostPassScreen;
