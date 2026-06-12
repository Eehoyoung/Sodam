import {AppToast, AppButton, AppCard, AppHeader, AppListItem, AppText, ErrorState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useState, useEffect} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {RouteProp, NavigationProp} from '@react-navigation/native';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {InviteShareSheet} from '../components/StoreSheets';
import storeService, {StoreDetailDto} from '../services/storeService';

type StoreDetailScreenRouteProp = RouteProp<{StoreDetail: {storeId: number}}, 'StoreDetail'>;

interface StoreDetailScreenProps {
    route: StoreDetailScreenRouteProp;
    navigation: NavigationProp<any>;
}

/**
 * 13 StoreDetail — 확정 시안.
 * 매장 상세. loadStoreDetail/storeService 로직 보존. (GET /api/stores/{storeId})
 */
export default function StoreDetailScreen({route, navigation}: StoreDetailScreenProps) {
    const {storeId} = route.params;
    const [store, setStore] = useState<StoreDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteVisible, setInviteVisible] = useState(false);

    const shareCode = async () => {
        if (!store?.storeCode) {
            return;
        }
        try {
            await Share.share({
                message: `${store.storeName} 직원 초대 코드: ${store.storeCode}\n소담 앱에서 이 코드로 매장에 합류하세요.`,
            });
        } catch (_) {/* ignore */}
    };

    const copyCode = () => AppToast.show(`초대 코드: ${store?.storeCode ?? ''}`);

    useEffect(() => {
        loadStoreDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const loadStoreDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await storeService.getStoreById(storeId);
            setStore(data);
        } catch (err: any) {
            setError(err?.message || '매장 정보를 불러오는데 실패했어요.');
            AppToast.error('매장 정보를 불러오는데 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    const header = <AppHeader title="매장 운영" onBack={() => navigation.goBack()} actions={[{label: '편집', onPress: () => (navigation as any).navigate('StoreEdit', {storeId})}]} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="매장 정보 로딩 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- boolean condition (logical OR), not value coalescing
    if (error || !store) {
        return (
            <ScreenContainer header={header}>
                {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string error should fall back to default text, so ?? would be wrong */}
                <ErrorState title="불러오지 못했어요" description={error || '매장 정보를 찾을 수 없어요.'} primary={{label: '다시 시도', onPress: loadStoreDetail}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="navy" hero>
                <AppText variant="headingSm" tone="inverse" numberOfLines={1} style={styles.heroName}>{store.storeName}</AppText>
                <AppText variant="caption" tone="inverse" style={styles.heroSub}>{store.storeCode} · {store.businessType}</AppText>
            </AppCard>

            <Section title="기본 정보">
                <InfoRow label="주소" value={store.fullAddress} />
                {store.businessNumber ? <InfoRow label="사업자번호" value={store.businessNumber} /> : null}
                {store.storePhoneNumber ? <InfoRow label="전화번호" value={store.storePhoneNumber} /> : null}
            </Section>

            <Section title="근무 정보">
                <InfoRow label="기준 시급" value={`${store.storeStandardHourWage.toLocaleString()}원`} />
                {store.employeeCount !== undefined ? <InfoRow label="직원 수" value={`${store.employeeCount}명`} /> : null}
            </Section>

            {store.latitude !== undefined && store.longitude !== undefined ? (
                <Section title="위치 설정">
                    <InfoRow label="위도" value={store.latitude.toFixed(6)} />
                    <InfoRow label="경도" value={store.longitude.toFixed(6)} />
                    {store.radius ? <InfoRow label="인증 반경" value={`${store.radius}m`} /> : null}
                </Section>
            ) : null}

            <View style={styles.section}>
                <AppText variant="titleMd" style={styles.sectionTitle}>매장 관리</AppText>
                <AppCard variant="flat">
                    <AppListItem
                        title="직원 시급 정책"
                        subtitle="매장 기준 시급과 변경 이력"
                        right="›"
                        onPress={() => (navigation as any).navigate('WageSettings', {storeId})}
                    />
                    <AppListItem
                        title="운영시간 설정"
                        subtitle="요일별 영업·휴무 시간"
                        right="›"
                        onPress={() => (navigation as any).navigate('StoreOperatingHours', {storeId})}
                    />
                    <AppListItem
                        title="직원 초대"
                        subtitle="초대 코드 공유로 직원 합류"
                        right="›"
                        onPress={() => setInviteVisible(true)}
                    />
                </AppCard>
                <AppButton
                    label="매장 정보 편집"
                    variant="outline"
                    onPress={() => (navigation as any).navigate('StoreEdit', {storeId})}
                    style={styles.editBtn}
                />
            </View>

            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- boolean condition (logical OR), not value coalescing */}
            {store.createdAt || store.updatedAt ? (
                <Section title="시스템 정보">
                    {store.createdAt ? <InfoRow label="등록일" value={new Date(store.createdAt).toLocaleDateString('ko-KR')} /> : null}
                    {store.updatedAt ? <InfoRow label="수정일" value={new Date(store.updatedAt).toLocaleDateString('ko-KR')} /> : null}
                </Section>
            ) : null}

            <InviteShareSheet
                visible={inviteVisible}
                onClose={() => setInviteVisible(false)}
                code={store.storeCode}
                onShareKakao={shareCode}
                onShareSms={shareCode}
                onCopy={copyCode}
            />
        </ScreenContainer>
    );
}

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
        <AppText variant="titleMd" style={styles.sectionTitle}>{title}</AppText>
        <AppCard variant="flat">{children}</AppCard>
    </View>
);

const InfoRow: React.FC<{label: string; value: string}> = ({label, value}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.infoRow, {borderBottomColor: c.divider}]}>
            <AppText variant="bodyMd" tone="secondary">{label}</AppText>
            <AppText variant="bodyMd" weight="600" style={styles.infoValue}>{value}</AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    heroName: {flexShrink: 1},
    heroSub: {marginTop: 4, opacity: 0.82},
    editBtn: {marginTop: spacing.md},
    section: {marginTop: spacing.lg},
    sectionTitle: {marginBottom: spacing.sm},
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1,
        gap: spacing.md,
    },
    infoValue: {flex: 1, textAlign: 'right'},
});
