import React, {useCallback, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppHeader,
    AppListItem,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import storeService, {StoreSummaryDto} from '../services/storeService';

/** 개발용 시각 검증 전용 — 실 매장 목록 조회를 고정 목록으로 대체한다. */
export interface StoreListVisualFixture {
    stores: StoreSummaryDto[];
}

interface Props {
    visualFixture?: StoreListVisualFixture;
}

/**
 * 11 StoreList — 다매장 사장 목록 화면(신규, v3 §4.1).
 * 기존 "매장" 탭이 첫 매장으로 바로 이동하던 단일 매장 경로는 그대로 두고,
 * 다매장 사장만 여기로 진입한다(RoleTabBar 분기).
 */
const StoreListScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const [stores, setStores] = useState<StoreSummaryDto[]>(visualFixture?.stores ?? []);
    const [loading, setLoading] = useState(!visualFixture);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        try {
            setError(false);
            const list = await storeService.getMasterStores('current');
            setStores(list);
        } catch (e) {
            console.warn('[StoreList] load failed', e);
            setError(true);
            AppToast.error('매장 목록을 불러오지 못했어요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [visualFixture]);

    // 쓰기(매장 등록/정보수정) 후 목록 미갱신 방지 — useFocusEffect refetch 패턴.
    useFocusEffect(useCallback(() => {
        if (visualFixture) {
            return;
        }
        load();
    }, [load, visualFixture]));

    const header = (
        <AppHeader
            title="내 매장"
            onBack={() => navigation.goBack()}
            actions={[{label: '추가', onPress: () => navigation.navigate('StoreRegistration')}]}
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="매장 목록을 불러오는 중" description="잠시만 기다려 주세요." />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="매장 목록을 불러오지 못했어요"
                    description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    if (stores.length === 0) {
        return (
            <ScreenContainer header={header}>
                <EmptyState
                    title="아직 등록된 매장이 없어요"
                    description="매장을 등록하면 직원 초대와 출퇴근, 급여 정산을 바로 시작할 수 있어요."
                    primary={{label: '매장 등록하기', onPress: () => navigation.navigate('StoreRegistration')}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false} header={header}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
                    setRefreshing(true);
                    load();
                }} />}
                showsVerticalScrollIndicator={false}>
                {stores.map(store => {
                    const configured = !!store.fullAddress;
                    return (
                        <AppListItem
                            key={store.id}
                            title={store.storeName}
                            subtitle={configured
                                ? `직원 ${store.employeeCount ?? 0}명 · 오늘 출근 ${store.todayAttendance ?? 0}명`
                                : '위치 설정이 필요해요'}
                            right={<AppBadge label={configured ? '운영중' : '설정'} tone={configured ? 'success' : 'warning'} />}
                            onPress={() => navigation.navigate('StoreDetail', {storeId: store.id})}
                            style={styles.item}
                        />
                    );
                })}
                <AppButton
                    label="새 매장 등록"
                    variant="outline"
                    onPress={() => navigation.navigate('StoreRegistration')}
                    style={styles.registerBtn}
                />
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm},
    item: {marginBottom: 0},
    registerBtn: {marginTop: spacing.md},
});

export default StoreListScreen;
