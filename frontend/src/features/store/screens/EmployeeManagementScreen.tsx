import React, {useCallback, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppToast,
    AppButton,
    AppHeader,
    AppListItem,
    AppText,
    CtaStack,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {InviteShareSheet} from '../components/StoreSheets';
import storeService, {StoreEmployeeDto} from '../services/storeService';

type EmployeeManagementRouteProp = RouteProp<HomeStackParamList, 'EmployeeManagement'>;

interface Props {
    route: EmployeeManagementRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

const ROLE_LABEL: Record<string, string> = {
    ROLE_MANAGER: '매니저',
    ROLE_EMPLOYEE: '직원',
    MANAGER: '매니저',
    EMPLOYEE: '직원',
};

/**
 * 직원 관리 — 매장 소속 직원 명부. (GET /api/stores/{storeId}/employees)
 * '직원 관리' 퀵메뉴 전용. 매장 운영(StoreDetail)과 분리해 직원 정보만 보여준다.
 * 행 탭 → EmployeeDetail. 비어있으면 초대 유도.
 */
export default function EmployeeManagementScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [employees, setEmployees] = useState<StoreEmployeeDto[]>([]);
    const [storeCode, setStoreCode] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteVisible, setInviteVisible] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [list, store] = await Promise.all([
                storeService.getStoreEmployees(storeId),
                storeService.getStoreById(storeId).catch(() => null),
            ]);
            setEmployees(list);
            if (store?.storeCode) {setStoreCode(store.storeCode);}
        } catch (err: any) {
            setError(err?.message || '직원 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    // 포커스마다 재조회 — 직원 입사(코드)·삭제 등으로 목록이 바뀐 뒤 복귀해도 최신 반영.
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const shareCode = async () => {
        if (!storeCode) {return;}
        try {
            await Share.share({
                message: `직원 초대 코드: ${storeCode}\n소담 앱에서 이 코드로 매장에 합류하세요.`,
            });
        } catch (_) {/* ignore */}
    };
    const copyCode = () => AppToast.show(`초대 코드: ${storeCode}`);

    const header = (
        <AppHeader
            title="직원 관리"
            onBack={() => navigation.goBack()}
            actions={storeCode ? [{label: '초대', onPress: () => setInviteVisible(true)}] : undefined}
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="직원 정보 로딩 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description={error} primary={{label: '다시 시도', onPress: load}} />
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
            {employees.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="people-outline" size={40} color={c.textInverse} />}
                    title="아직 등록된 직원이 없어요"
                    description="초대 코드를 공유하면 직원이 매장에 합류할 수 있어요."
                />
            ) : (
                <View style={styles.section}>
                    <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>
                        직원 {employees.length}명
                    </AppText>
                    <View style={styles.list}>
                        {employees.map(emp => (
                            <AppListItem
                                key={emp.id}
                                title={emp.name}
                                subtitle={emp.phone || ROLE_LABEL[emp.userGrade ?? ''] || '직원'}
                                onPress={() => navigation.navigate('EmployeeDetail', {employeeId: emp.id, storeId})}
                                right={<Ionicons name="chevron-forward" size={20} color={c.textTertiary} />}
                                left={
                                    <View style={[styles.avatar, {backgroundColor: c.brandPrimarySoft}]}>
                                        <AppText variant="titleMd" tone="brand">{emp.name.slice(0, 1)}</AppText>
                                    </View>
                                }
                            />
                        ))}
                    </View>
                </View>
            )}

            <InviteShareSheet
                visible={inviteVisible}
                onClose={() => setInviteVisible(false)}
                code={storeCode}
                onShareKakao={shareCode}
                onShareSms={shareCode}
                onCopy={copyCode}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    section: {marginTop: spacing.md},
    sectionTitle: {marginBottom: spacing.md},
    list: {gap: spacing.sm},
    avatar: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
