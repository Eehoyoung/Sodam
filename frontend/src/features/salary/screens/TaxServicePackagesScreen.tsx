import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    CtaStack,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {isTossLive} from '../../../common/config/env';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    useCreateTaxServiceOrder,
    useMockTaxServicePurchase,
    useMyTaxServiceOrders,
    useTaxPaymentReadiness,
    useTaxServicePackages,
} from '../hooks/useTaxServiceOrders';
import type {TaxPackageType, TaxServiceOrderStatus} from '../services/taxServiceOrderApi';

const formatWon = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

const statusLabel: Record<TaxServiceOrderStatus, string> = {
    PENDING: '결제 대기', PAID: '신청 완료', CANCELLED: '취소됨', REFUNDED: '환불됨',
};

const statusTone: Record<TaxServiceOrderStatus, 'neutral' | 'success' | 'warning'> = {
    PENDING: 'warning', PAID: 'success', CANCELLED: 'neutral', REFUNDED: 'neutral',
};

const TaxServicePackagesScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const packagesQuery = useTaxServicePackages();
    const ordersQuery = useMyTaxServiceOrders();
    const purchaseMutation = useMockTaxServicePurchase();
    const createOrderMutation = useCreateTaxServiceOrder();
    const readinessQuery = useTaxPaymentReadiness();
    const refetchPackages = packagesQuery.refetch;
    const refetchOrders = ordersQuery.refetch;
    const refetchReadiness = readinessQuery.refetch;
    const [selectedPackageType, setSelectedPackageType] = useState<TaxPackageType | null>(null);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const livePaymentEnabled = isTossLive();

    useFocusEffect(useCallback(() => {
        refetchPackages().catch(() => undefined);
        refetchOrders().catch(() => undefined);
        refetchReadiness().catch(() => undefined);
    }, [refetchOrders, refetchPackages, refetchReadiness]));

    useEffect(() => {
        if (!selectedPackageType && packagesQuery.data?.[0]) {
            setSelectedPackageType(packagesQuery.data[0].name);
        }
    }, [packagesQuery.data, selectedPackageType]);

    const selectedPackage = useMemo(
        () => packagesQuery.data?.find(item => item.name === selectedPackageType) ?? null,
        [packagesQuery.data, selectedPackageType],
    );

    const refresh = useCallback(() => {
        setPurchaseError(null);
        refetchPackages().catch(() => undefined);
        refetchOrders().catch(() => undefined);
        refetchReadiness().catch(() => undefined);
    }, [refetchOrders, refetchPackages, refetchReadiness]);

    const handlePurchase = useCallback(async () => {
        if (!selectedPackageType) {
            return;
        }
        setPurchaseError(null);
        const readiness = readinessQuery.data;
        const hasLiveCallbacks = !!readiness?.successUrl && !!readiness?.failUrl;
        try {
            if (readiness?.mode === 'MOCK' && !livePaymentEnabled) {
                await purchaseMutation.mutateAsync(selectedPackageType);
                return;
            }
            if (readiness?.mode === 'LIVE' && livePaymentEnabled && hasLiveCallbacks) {
                const order = await createOrderMutation.mutateAsync(selectedPackageType);
                navigation.navigate('TaxServicePayment', {
                    orderId: order.orderId,
                    amount: order.amount,
                    orderName: order.orderName,
                    successUrl: readiness.successUrl!,
                    failUrl: readiness.failUrl!,
                });
                return;
            }
            setPurchaseError('결제 환경이 일치하지 않아요. 잠시 후 다시 시도해 주세요.');
        } catch (error: unknown) {
            setPurchaseError(
                (error as {response?: {data?: {message?: string}}})?.response?.data?.message ??
                '신청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
            );
        }
    }, [createOrderMutation, livePaymentEnabled, navigation, purchaseMutation, readinessQuery.data, selectedPackageType]);

    const isInitialLoading = (packagesQuery.isLoading || ordersQuery.isLoading) &&
        !packagesQuery.data && !ordersQuery.data;
    const hasLoadError = packagesQuery.isError || ordersQuery.isError;

    if (isInitialLoading) {
        return <ScreenContainer header={<AppHeader title="세무 전문가 연결" onBack={() => navigation.goBack()} />}><LoadingState title="세무 패키지를 불러오는 중" /></ScreenContainer>;
    }

    if (hasLoadError && !packagesQuery.data) {
        return <ScreenContainer header={<AppHeader title="세무 전문가 연결" onBack={() => navigation.goBack()} />}><ErrorState title="세무 패키지를 불러오지 못했어요" description="네트워크 상태를 확인한 뒤 다시 시도해 주세요." primary={{label: '다시 시도', onPress: refresh}} /></ScreenContainer>;
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세무 전문가 연결" onBack={() => navigation.goBack()} />}
            footer={<CtaStack><AppButton testID="tax-service-purchase" label={selectedPackage ? `${selectedPackage.displayName} ${livePaymentEnabled ? '결제하기' : '모의 결제'}` : '패키지를 선택해 주세요'} loading={purchaseMutation.isPending || createOrderMutation.isPending} loadingLabel="신청 처리 중" disabled={!selectedPackage} onPress={handlePurchase} /></CtaStack>}>
            {livePaymentEnabled ? <AppCard variant="warm" style={styles.notice}>
                <AppText variant="titleMd" weight="700">세무 패키지 결제</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.noticeDescription}>결제 완료 후 세무사 연결 신청이 접수됩니다.</AppText>
            </AppCard> : <AppCard variant="warm" style={styles.notice}>
                <AppText variant="titleMd" weight="700">현재는 모의 결제 환경입니다</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.noticeDescription}>실제 카드 청구 없이 신청 상태만 확인합니다. 세무 신고·상담은 제휴 세무사가 진행합니다.</AppText>
            </AppCard>}

            <View style={styles.sectionHeader}>
                <AppText variant="headingSm">세무 패키지 선택</AppText>
                <AppButton label="새로고침" size="sm" variant="ghost" fullWidth={false} onPress={refresh} />
            </View>
            <View style={styles.packageList}>
                {(packagesQuery.data ?? []).map(item => (
                    <AppCard key={item.name} variant={item.name === selectedPackageType ? 'spot' : 'flat'} selected={item.name === selectedPackageType} onPress={() => setSelectedPackageType(item.name)} accessibilityLabel={`${item.displayName} ${formatWon(item.amount)}`} testID={`tax-service-package-${item.name}`}>
                        <View style={styles.packageRow}>
                            <View style={styles.packageText}>
                                <AppText variant="titleMd" weight="700">{item.displayName}</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.packageDescription}>세무사 연결 및 신고 상담 신청</AppText>
                            </View>
                            <AppText variant="titleMd" tone="brand" weight="700">{formatWon(item.amount)}</AppText>
                        </View>
                    </AppCard>
                ))}
            </View>

            {purchaseMutation.isSuccess ? <AppCard variant="warm" style={styles.successCard}><AppText variant="bodyMd" weight="700">신청이 완료됐어요</AppText><AppText variant="caption" tone="secondary" style={styles.noticeDescription}>아래 신청 내역에서 처리 상태를 확인할 수 있어요.</AppText></AppCard> : null}
            {purchaseError ? <AppCard variant="danger" style={styles.errorCard}><AppText variant="bodyMd" weight="700">{purchaseError}</AppText><AppButton label="다시 시도" size="sm" variant="ghost" fullWidth={false} onPress={handlePurchase} /></AppCard> : null}

            <AppText variant="headingSm" style={styles.historyTitle}>내 신청 내역</AppText>
            {ordersQuery.isError ? <ErrorState title="신청 내역을 불러오지 못했어요" primary={{label: '새로고침', onPress: refresh}} /> : (ordersQuery.data ?? []).length === 0 ? <EmptyState title="아직 신청한 세무 패키지가 없어요" /> : <View style={styles.orderList}>
                {(ordersQuery.data ?? []).map(order => <AppCard key={order.orderId} variant="flat" style={styles.orderCard}><View style={styles.packageRow}><View style={styles.packageText}><AppText variant="bodyLg" weight="700">{order.orderName}</AppText><AppText variant="caption" tone="secondary">{formatWon(order.amount)}</AppText></View><AppBadge label={statusLabel[order.status]} tone={statusTone[order.status]} /></View></AppCard>)}
            </View>}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    notice: {marginBottom: spacing.xl}, noticeDescription: {marginTop: spacing.xs},
    sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md},
    packageList: {gap: spacing.md}, packageRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md}, packageText: {flex: 1}, packageDescription: {marginTop: 2},
    successCard: {marginTop: spacing.lg}, errorCard: {marginTop: spacing.lg, gap: spacing.sm},
    historyTitle: {marginTop: spacing.xxl, marginBottom: spacing.md}, orderList: {gap: spacing.sm, paddingBottom: spacing.xxl}, orderCard: {paddingVertical: spacing.md},
});

export default TaxServicePackagesScreen;
