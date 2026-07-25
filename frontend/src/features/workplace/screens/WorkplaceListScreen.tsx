import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
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
import {useAuth} from '../../../contexts/AuthContext';
import storeService, {StoreSummaryDto} from '../../store/services/storeService';

/**
 * 15 WorkplaceList — 신규 화면(v3 §4.1).
 *
 * ⚠️ 갭: 시안은 "개인 기록용 근무지"(고용주 없이 직접 기록만 하는 근무지, 예: 알바 대타)와
 * "직원으로 가입된 매장"을 한 목록에 섞어 보여준다. 소담 BE 에는 전자에 대응하는 데이터 모델이
 * 없다(features/workplace/services/workplaceService.ts 는 store 마스터 엔드포인트를 그대로 재호출하는
 * 죽은 코드였고 개인 근무지 개념이 아니다) — 그래서 이 화면은 실데이터가 있는
 * "내가 직원으로 소속된 매장"(GET /api/stores/employee/{userId})만 보여준다.
 * 개인 근무지 트래킹은 새 BE 엔티티가 필요한 별도 스코프로 남겨둔다.
 */
const WorkplaceListScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const [stores, setStores] = useState<StoreSummaryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            setError(false);
            const list = await storeService.getEmployeeStores(user.id);
            setStores(list);
        } catch (e) {
            console.warn('[WorkplaceList] load failed', e);
            setError(true);
            AppToast.error('근무지 목록을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const header = <AppHeader title="근무지" onBack={() => navigation.goBack()}
        actions={[{label: '추가', onPress: () => navigation.navigate('JoinStoreByCode')}]} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="근무지를 불러오는 중" description="잠시만 기다려 주세요." />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="근무지 목록을 불러오지 못했어요" description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    if (stores.length === 0) {
        return (
            <ScreenContainer header={header}>
                <EmptyState
                    title="소속된 근무지가 없어요"
                    description="사장님께 받은 초대 코드로 매장에 합류해 보세요."
                    primary={{label: '초대 코드로 합류', onPress: () => navigation.navigate('JoinStoreByCode')}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false} header={header}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {stores.map(store => (
                    <AppListItem
                        key={store.id}
                        title={store.storeName}
                        subtitle="직원 가입 · 승인됨"
                        right={<AppBadge label="직원" tone="info" />}
                        onPress={() => navigation.navigate('WorkplaceDetail', {storeId: store.id, storeName: store.storeName})}
                    />
                ))}
                <AppButton
                    label="근무지 추가"
                    variant="outline"
                    onPress={() => navigation.navigate('JoinStoreByCode')}
                    style={styles.addBtn}
                />
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm},
    addBtn: {marginTop: spacing.md},
});

export default WorkplaceListScreen;
