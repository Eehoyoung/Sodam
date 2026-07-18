import React, {useCallback} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useManagedStores} from '../../manager/hooks/useManagedStores';
import {MANAGER_PERMISSION_LABEL} from '../../manager/types';
import {spacing} from '../../../theme/tokens';

const ManagerMyPageScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const stores = useManagedStores();

    useFocusEffect(useCallback(() => {
        stores.refetch();
        // The query observer object changes as data arrives; refetch itself is the stable dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stores.refetch]));

    if (stores.isLoading) {
        return <ScreenContainer header={<AppHeader title="내 위임 현황" onBack={() => navigation.goBack()} />}>
            <LoadingState title="위임 현황 불러오는 중" description="매장별 서명 상태와 권한을 확인하고 있어요." />
        </ScreenContainer>;
    }

    if (stores.isError) {
        return <ScreenContainer header={<AppHeader title="내 위임 현황" onBack={() => navigation.goBack()} />}>
            <ErrorState title="위임 현황을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
                primary={{label: '다시 시도', onPress: () => stores.refetch()}} />
        </ScreenContainer>;
    }

    return (
        <ScreenContainer padded={false} header={<AppHeader title="내 위임 현황" onBack={() => navigation.goBack()} />}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={stores.isRefetching} onRefresh={() => stores.refetch()} />}>
                {(stores.data?.length ?? 0) === 0 ? (
                    <EmptyState title="위임받은 매장이 없어요"
                        description="사업주가 위임장을 만들면 서명 대기 상태부터 이곳에 표시됩니다." />
                ) : stores.data?.map(store => (
                    <AppCard key={store.storeId} variant={store.active ? 'plain' : 'warm'}>
                        <View style={styles.headingRow}>
                            <View style={styles.flex}>
                                <AppText variant="headingSm">{store.storeName}</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.caption}>
                                    위임장 버전 {store.delegationVersion}
                                    {store.acceptedAt ? ` · ${new Date(store.acceptedAt).toLocaleDateString('ko-KR')} 발효` : ''}
                                </AppText>
                            </View>
                            <AppBadge label={store.active ? '권한 발효' : signatureLabel(store.signatureStatus)}
                                tone={store.active ? 'success' : 'warning'} />
                        </View>

                        <View style={styles.permissions}>
                            {store.permissions.map(permission => (
                                <AppBadge key={permission} label={MANAGER_PERMISSION_LABEL[permission]} tone="neutral" />
                            ))}
                        </View>

                        {!store.active && store.signatureEnvelopeId ? (
                            <AppButton label="전자서명 확인" style={styles.button}
                                onPress={() => navigation.navigate('ElectronicSign', {envelopeId: store.signatureEnvelopeId as number})} />
                        ) : null}
                        {store.active ? (
                            <AppButton label="매장 운영 화면" variant="secondary" style={styles.button}
                                onPress={() => navigation.navigate('OwnerDashboard', {storeId: store.storeId, managerMode: true})} />
                        ) : null}
                    </AppCard>
                ))}

                <View style={styles.section}>
                    <AppText variant="titleMd">운영 바로가기</AppText>
                    <AppListItem title="알림 센터" subtitle="승인 요청과 서명 상태 변경을 확인해요."
                        right="›" onPress={() => navigation.navigate('NotificationCenter')} />
                    <AppListItem title="계정 설정" subtitle="전자서명에 필요한 휴대전화·생년월일을 관리해요."
                        right="›" onPress={() => navigation.navigate('AccountSettings')} />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
};

const signatureLabel = (status?: string | null) => ({
    VERIFIED: '검증 완료', DECLINED: '서명 거절', EXPIRED: '서명 만료', FAILED: '처리 실패',
    CANCELLED: '요청 취소', MANUAL_REISSUE_REQUIRED: '재발행 필요', IN_PROGRESS: '서명 대기',
}[status ?? ''] ?? '서명 준비');

const styles = StyleSheet.create({
    content: {padding: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.lg},
    headingRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    flex: {flex: 1},
    caption: {marginTop: spacing.xs},
    permissions: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md},
    button: {marginTop: spacing.lg},
    section: {marginTop: spacing.sm, gap: spacing.sm},
});

export default ManagerMyPageScreen;
