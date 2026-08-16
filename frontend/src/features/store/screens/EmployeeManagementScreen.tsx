import React, {useCallback, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect, type RouteProp} from '@react-navigation/native';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppToast,
    AppBadge,
    AppButton,
    AppCard,
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
import {
    HeadcountSimulationResponse,
    simulateStatutoryHeadcount,
} from '../../risk/services/riskService';
import {logger} from '../../../utils/logger';

type EmployeeManagementRouteProp = RouteProp<HomeStackParamList, 'EmployeeManagement'>;

interface Props {
    route: EmployeeManagementRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
    /** 개발용 시각 검증에서만 쓰는 결정형 직원 명부. */
    visualFixture?: EmployeeManagementVisualFixture;
}

export interface EmployeeManagementVisualFixture {
    employees: StoreEmployeeDto[];
    storeCode: string;
}

const ROLE_LABEL: Record<string, string> = {
    ROLE_MANAGER: '매니저',
    ROLE_EMPLOYEE: '직원',
    MANAGER: '매니저',
    EMPLOYEE: '직원',
};

/** 매니저는 success(teal) 배지, 일반 직원은 neutral 배지 — 아티팩트 O3 list-item 배지 톤. */
const isManagerGrade = (grade?: string): boolean => grade === 'ROLE_MANAGER' || grade === 'MANAGER';

/**
 * 직원 관리 — 매장 소속 직원 명부. (GET /api/stores/{storeId}/employees)
 * '직원 관리' 퀵메뉴 전용. 매장 운영(StoreDetail)과 분리해 직원 정보만 보여준다.
 * 행 탭 → EmployeeDetail. 비어있으면 초대 유도.
 * 목록 행 우측에 역할 배지(직원/매니저)를 추가해 아티팩트 O3 list-item과 정렬
 * (docs/260720/artifacts/sodam-v3-13-ops.html O3 대조 반영).
 */
export default function EmployeeManagementScreen({route, navigation, visualFixture}: Props) {
    const {storeId, managerMode = false} = route.params;
    const c = useThemeColors();
    const [employees, setEmployees] = useState<StoreEmployeeDto[]>(() => visualFixture?.employees ?? []);
    const [storeCode, setStoreCode] = useState<string>(() => visualFixture?.storeCode ?? '');
    const [loading, setLoading] = useState(!visualFixture);
    const [error, setError] = useState<string | null>(null);
    const [inviteVisible, setInviteVisible] = useState(false);
    // 260816 WP-A — "직원 1명 더 등록하면 상시근로자 5인 경계를 넘을 가능성"을 참고로 보여준다.
    // 조회 실패는 카드만 숨기고(best-effort) 초대 흐름 자체는 절대 막지 않는다(HC-5).
    const [headcountSimulation, setHeadcountSimulation] = useState<HeadcountSimulationResponse | null>(null);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const [list, store] = await Promise.all([
                storeService.getStoreEmployees(storeId),
                managerMode ? Promise.resolve(null) : storeService.getStoreById(storeId).catch(() => null),
            ]);
            setEmployees(list);
            if (store?.storeCode) {setStoreCode(store.storeCode);}
        } catch (err: any) {
            setError(err?.message ?? '직원 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
        if (!managerMode) {
            try {
                setHeadcountSimulation(await simulateStatutoryHeadcount(storeId, 1));
            } catch (hcError) {
                logger.debug('[EmployeeManagement] headcount simulation load failed', hcError);
                setHeadcountSimulation(null);
            }
        }
    }, [storeId, managerMode, visualFixture]);

    // 포커스마다 재조회 — 직원 입사(코드)·삭제 등으로 목록이 바뀐 뒤 복귀해도 최신 반영.
    useFocusEffect(
        useCallback(() => {
            if (!visualFixture) {
                void load();
            }
        }, [load, visualFixture]),
    );

    // 실시간 동기화 — 이 매장에 직원이 입사/활성토글되면(보고 있는 동안) 목록 즉시 갱신.
    useStoreLiveSync(visualFixture ? [] : storeId ? [storeId] : [], () => {
        if (!visualFixture) {
            void load();
        }
    });

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
            title={managerMode ? '직원 조회' : '직원 관리'}
            onBack={() => navigation.goBack()}
            actions={!managerMode && storeCode ? [{label: '초대', onPress: () => setInviteVisible(true)}] : undefined}
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
            footer={!managerMode ? (
                <CtaStack>
                    <AppButton label="직원 초대하기" onPress={() => setInviteVisible(true)} />
                </CtaStack>
            ) : undefined}>
            {headcountSimulation?.crossesThreshold ? (
                <AppCard variant="flat" style={[styles.headcountWarn, {backgroundColor: c.warningBg}]}>
                    <View style={styles.headcountWarnRow}>
                        <Ionicons name="alert-circle-outline" size={20} color={c.warning} />
                        <AppText variant="titleMd" weight="700" style={styles.headcountWarnFlex}>
                            1명 더 채용하면 상시근로자 5인 이상에 해당할 가능성이 있어요
                        </AppText>
                    </View>
                    <AppText variant="bodyMd" tone="secondary" style={styles.headcountWarnSub}>
                        가산수당·연차·부당해고 제한이 새로 적용될 수 있어요. 월 인건비 영향 약{' '}
                        {Math.round(headcountSimulation.estimatedMonthlyCostMin / 10_000)}~
                        {Math.round(headcountSimulation.estimatedMonthlyCostMax / 10_000)}만원(참고).
                    </AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.headcountWarnDisclaimer}>
                        {headcountSimulation.disclaimer}
                    </AppText>
                </AppCard>
            ) : null}

            {employees.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="people-outline" size={40} color={c.textInverse} />}
                    title="아직 등록된 직원이 없어요"
                    description={managerMode ? '현재 조회할 수 있는 직원이 없어요.' : '초대 코드를 공유하면 직원이 매장에 합류할 수 있어요.'}
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
                                subtitle={emp.phone}
                                onPress={managerMode ? undefined : () => navigation.navigate('EmployeeDetail', {employeeId: emp.id, storeId})}
                                right={
                                    // 아티팩트 O3: 이름 옆 역할 배지(직원/매니저) + 상세 진입 chevron 동시 표기.
                                    <View style={styles.rightRow}>
                                        <AppBadge
                                            label={ROLE_LABEL[emp.userGrade ?? ''] ?? '직원'}
                                            tone={isManagerGrade(emp.userGrade) ? 'success' : 'neutral'}
                                        />
                                        {managerMode ? null : (
                                            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
                                        )}
                                    </View>
                                }
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

            {!managerMode ? (
                <InviteShareSheet
                    visible={inviteVisible}
                    onClose={() => setInviteVisible(false)}
                    code={storeCode}
                    onShareKakao={shareCode}
                    onShareSms={shareCode}
                    onCopy={copyCode}
                />
            ) : null}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    section: {marginTop: spacing.md},
    sectionTitle: {marginBottom: spacing.md},
    list: {gap: spacing.sm},
    rightRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    avatar: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headcountWarn: {marginBottom: spacing.lg, gap: spacing.xs},
    headcountWarnRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    headcountWarnFlex: {flex: 1, minWidth: 0},
    headcountWarnSub: {marginTop: spacing.xs},
    headcountWarnDisclaimer: {marginTop: spacing.sm},
});
