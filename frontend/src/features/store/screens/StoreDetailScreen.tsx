import {AppToast, AppButton, AppCard, AppHeader, AppListItem, AmountText, AppText, CtaStack, ErrorState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useState, useCallback} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect, type RouteProp} from '@react-navigation/native';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {InviteShareSheet} from '../components/StoreSheets';
import storeService, {StoreDetailDto} from '../services/storeService';

type StoreDetailScreenRouteProp = RouteProp<HomeStackParamList, 'StoreDetail'>;

interface StoreDetailScreenProps {
    route: StoreDetailScreenRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

/**
 * 13 StoreDetail — v3 토스식.
 * 히어로: 매장명 + 기본시급(AmountText). 관리 진입은 큰 리스트. 하단 CTA 1개(직원 초대).
 * loadStoreDetail/storeService 로직 보존. (GET /api/stores/{storeId})
 */
export default function StoreDetailScreen({route, navigation}: StoreDetailScreenProps) {
    const {storeId} = route.params;
    const c = useThemeColors();
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

    // 포커스마다 재조회 — 직원 입사/해고·매장 정보·운영시간 변경 후 복귀 시 상세 최신화.
    useFocusEffect(
        useCallback(() => {
            loadStoreDetail();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [storeId]),
    );

    // 실시간 동기화 — 이 매장의 직원 입사/해지·출퇴근 변경 시(보고 있는 동안) 상세 즉시 갱신.
    useStoreLiveSync(storeId ? [storeId] : [], () => loadStoreDetail());

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

    const header = <AppHeader title="매장 운영" onBack={() => navigation.goBack()} actions={[{label: '편집', onPress: () => navigation.navigate('StoreEdit', {storeId})}]} />;

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
        <ScreenContainer
            scroll
            header={header}
            footer={
                <CtaStack>
                    <AppButton label="직원 초대하기" onPress={() => setInviteVisible(true)} />
                </CtaStack>
            }>
            {/* 히어로: 매장명 + 기본시급 (숫자가 히어로) */}
            <View style={styles.hero}>
                <AppText variant="caption" tone="secondary">기본 시급</AppText>
                <AmountText size={44} tone="primary" style={styles.heroAmount}>
                    {`${store.storeStandardHourWage.toLocaleString()}원`}
                </AmountText>
                <AppText variant="headingSm" numberOfLines={1} style={styles.heroName}>{store.storeName}</AppText>
                <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.heroSub}>
                    {store.storeCode} · {store.businessType}
                    {store.employeeCount !== undefined ? ` · 직원 ${store.employeeCount}명` : ''}
                </AppText>
            </View>

            {/* 매장 관리 — 큰 리스트 */}
            <View style={styles.section}>
                <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>매장 관리</AppText>
                <View style={styles.list}>
                    <ManageItem
                        c={c}
                        icon="cash-outline"
                        title="직원 시급 정책"
                        subtitle="매장 기준 시급과 변경 이력"
                        onPress={() => navigation.navigate('WageSettings', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="time-outline"
                        title="운영시간 설정"
                        subtitle="요일별 영업·휴무 시간"
                        onPress={() => navigation.navigate('StoreOperatingHours', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="megaphone-outline"
                        title="매장 공지"
                        subtitle="공지를 올리고 누가 읽었는지 확인"
                        onPress={() => navigation.navigate('StoreNoticeList', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="pricetags-outline"
                        title="NFC 태그 관리"
                        subtitle="매장에 부착한 출퇴근 인증 태그 등록·관리"
                        onPress={() => navigation.navigate('NfcTagManagement', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="receipt-outline"
                        title="매입장부"
                        subtitle="영수증으로 매입 기록·가격 비교"
                        onPress={() => navigation.navigate('PurchaseLedger', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="calculator-outline"
                        title="급여 미리보기"
                        subtitle="시급·근로시간으로 주휴 포함 예상급여"
                        onPress={() => navigation.navigate('PayrollPreview', {storeId, hourlyWage: store.storeStandardHourWage})}
                    />
                    <ManageItem
                        c={c}
                        icon="bar-chart-outline"
                        title="이번 주 인사이트"
                        subtitle="최근 7일 매장 활동 요약"
                        onPress={() => navigation.navigate('WeeklyInsights', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="document-text-outline"
                        title="세무 자료"
                        subtitle="간이지급명세서·원천징수 집계"
                        onPress={() => navigation.navigate('WithholdingStatement', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="book-outline"
                        title="법정 장부"
                        subtitle="임금대장·근로자명부 (근로감독 대비)"
                        onPress={() => navigation.navigate('LegalLedger', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="trending-up-outline"
                        title="고용 공제 신호"
                        subtitle="상시근로자 추이로 고용세액공제 가능성 확인"
                        onPress={() => navigation.navigate('HeadcountTrend', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="gift-outline"
                        title="지원금 자격"
                        subtitle="두루누리 사회보험료 지원 가능 직원 확인"
                        onPress={() => navigation.navigate('SubsidyEligibility', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="alarm-outline"
                        title="세무 신고 기한"
                        subtitle="원천세 월·부가세 분기 기한 알림"
                        onPress={() => navigation.navigate('TaxDeadline', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="mail-outline"
                        title="세무사 송부"
                        subtitle="인건비 내역서(세전) 이메일 발송"
                        onPress={() => navigation.navigate('TaxReport', {storeId})}
                    />
                    <ManageItem
                        c={c}
                        icon="calculator-outline"
                        title="세무 시뮬레이터"
                        subtitle="매출·경비로 예상 종합소득세 계산"
                        onPress={() => navigation.navigate('TaxSimulator')}
                    />
                    <ManageItem
                        c={c}
                        icon="person-add-outline"
                        title="직원 초대"
                        subtitle="초대 코드 공유로 직원 합류"
                        onPress={() => setInviteVisible(true)}
                    />
                    <ManageItem
                        c={c}
                        icon="create-outline"
                        title="매장 정보 편집"
                        subtitle="주소·연락처·업종 수정"
                        onPress={() => navigation.navigate('StoreEdit', {storeId})}
                    />
                </View>
            </View>

            {/* 매장 정보 */}
            <View style={styles.section}>
                <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>매장 정보</AppText>
                <AppCard variant="plain">
                    <InfoRow label="주소" value={store.fullAddress} />
                    {store.businessNumber ? <InfoRow label="사업자번호" value={store.businessNumber} /> : null}
                    {store.storePhoneNumber ? <InfoRow label="전화번호" value={store.storePhoneNumber} /> : null}
                    {store.radius ? <InfoRow label="인증 반경" value={`${store.radius}m`} /> : null}
                    {store.createdAt ? <InfoRow label="등록일" value={new Date(store.createdAt).toLocaleDateString('ko-KR')} last /> : null}
                </AppCard>
            </View>

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

type ThemeColors = ReturnType<typeof useThemeColors>;

const ManageItem: React.FC<{c: ThemeColors; icon: string; title: string; subtitle: string; onPress: () => void}> = ({c, icon, title, subtitle, onPress}) => (
    <AppListItem
        title={title}
        subtitle={subtitle}
        onPress={onPress}
        right={<Ionicons name="chevron-forward" size={20} color={c.textTertiary} />}
        left={
            <View style={[styles.iconWrap, {backgroundColor: c.brandPrimarySoft}]}>
                <Ionicons name={icon} size={20} color={c.brandPrimary} />
            </View>
        }
    />
);

const InfoRow: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.infoRow, !last && styles.infoRowBordered, !last && {borderBottomColor: c.divider}]}>
            <AppText variant="bodyMd" tone="secondary">{label}</AppText>
            <AppText variant="bodyMd" weight="600" numberOfLines={1} style={styles.infoValue}>{value}</AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.sm},
    heroAmount: {marginTop: spacing.xs},
    heroName: {marginTop: spacing.md},
    heroSub: {marginTop: spacing.xs},
    section: {marginTop: spacing.xxl},
    sectionTitle: {marginBottom: spacing.md},
    list: {gap: spacing.sm},
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        gap: spacing.md,
    },
    infoRowBordered: {borderBottomWidth: 1},
    infoValue: {flex: 1, textAlign: 'right'},
});
