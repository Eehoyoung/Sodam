import {AppBadge, AppToast, ConfirmSheet, AppButton, AppCard, AppHeader, AppInput, AppListItem, AmountText, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {formatWage} from '../../../common/format/money';
import storeService from '../services/storeService';
import {wageService} from '../../wage/services/wageService';

interface EmployeeWageRow {
    id: number;
    name: string;
    appliedWage?: number;
    isCustom: boolean;
}

/** 개발용 시각 검증 전용 — 매장 시급/이력/직원별 적용 시급 조회를 고정 데이터로 대체한다. */
export interface WageSettingsVisualFixture {
    currentWage: number | null;
    history?: Array<any>;
    employeeWages?: EmployeeWageRow[];
}

interface Props {
    visualFixture?: WageSettingsVisualFixture;
}

/**
 * 18 WageSettings — v3 토스식.
 * 히어로: 현재 매장 기본 시급(AmountText). 한 입력 + 하단 CTA. 아래 변경 이력.
 * 최저임금 경고 + PUT /api/wages/store/{id}/standard + history GET 로직 보존.
 */
const WageSettingsScreen: React.FC<Props> = ({visualFixture}) => {
    const route = useRoute<RouteProp<HomeStackParamList, 'WageSettings'>>();
    const navigation = useNavigation();
    const storeId = route.params.storeId;

    const [currentWage, setCurrentWage] = useState<number | null>(visualFixture?.currentWage ?? null);
    const [standardWage, setStandardWage] = useState(visualFixture?.currentWage ? String(visualFixture.currentWage) : '');
    const [history, setHistory] = useState<Array<any>>(visualFixture?.history ?? []);
    const [employeeWages, setEmployeeWages] = useState<EmployeeWageRow[]>(visualFixture?.employeeWages ?? []);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visualFixture) {
            return;
        }
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const store = await storeService.getStoreById(storeId);
                const wage = store.storeStandardHourWage;
                if (wage) {
                    setCurrentWage(wage);
                    setStandardWage(String(wage));
                }
            } catch (_) {/* ignore */}
            try {
                const list = await wageService.getStandardWageHistory(storeId);
                setHistory(list);
            } catch (_) {/* TODO[P2 BE]: WageHistory 조회 API 미노출 */}
            // 18 WageSettings 시안의 "직원별 적용 시급" 리스트 — 매장 기본/개별 시급 구분 배지.
            try {
                const employees = await storeService.getStoreEmployees(storeId);
                const rows = await Promise.all(employees.map(async emp => {
                    try {
                        const info = await wageService.getEmployeeWage(emp.id, storeId);
                        const isCustom = info.useStoreStandardWage === false && !!info.customHourlyWage;
                        return {
                            id: emp.id,
                            name: emp.name,
                            appliedWage: info.hourlyWage ?? info.customHourlyWage ?? undefined,
                            isCustom,
                        };
                    } catch (_) {
                        return {id: emp.id, name: emp.name, appliedWage: undefined, isCustom: false};
                    }
                }));
                setEmployeeWages(rows);
            } catch (_) {/* ignore */}
        })();
    }, [storeId, visualFixture]);

    const submit = async () => {
        const n = parseInt(standardWage.replace(/[^0-9]/g, ''), 10);
        if (!n || n < 1) {
            AppToast.warn('시급은 1원 이상이어야 해요.');
            return;
        }
        if (n < 9860) {
            ConfirmSheet.confirm({
                title: '최저시급보다 낮아요',
                description: '2026년 최저시급(가정 ₩9,860)보다 낮은 시급이에요. 그래도 적용할까요?',
                primary: {label: '그래도 적용', destructive: true, onPress: () => applyWage(n)},
                secondary: {label: '취소'},
            });
            return;
        }
        applyWage(n);
    };

    const applyWage = async (wage: number) => {
        setLoading(true);
        try {
            await wageService.putStandardHourlyWage(storeId, wage);
            setCurrentWage(wage);
            AppToast.success('매장 기본 시급이 변경됐어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '시급 변경에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="시급 정책" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="시급 변경하기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            {/* 히어로: 현재 시급 */}
            <View style={styles.hero}>
                <AppText variant="caption" tone="secondary">현재 매장 기본 시급</AppText>
                <AmountText size={48} tone="primary" style={styles.heroAmount}>
                    {currentWage ? `${currentWage.toLocaleString()}원` : '미설정'}
                </AmountText>
                <AppText variant="caption" tone="tertiary" style={styles.heroSub}>
                    직원별 개별 시급이 없으면 이 시급이 적용돼요.
                </AppText>
            </View>

            {/* 직원별 적용 시급 — 아티팩트 18: 매장 기본/개별 시급 구분 배지 */}
            {employeeWages.length > 0 ? (
                <View style={styles.section}>
                    <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>직원별 적용 시급</AppText>
                    <View style={styles.list}>
                        {employeeWages.map(row => (
                            <AppListItem
                                key={row.id}
                                title={row.name}
                                subtitle={row.isCustom ? '개별 시급 적용' : '기본 시급 적용'}
                                right={
                                    <AppBadge
                                        label={row.appliedWage ? formatWage(row.appliedWage) : '-'}
                                        tone={row.isCustom ? 'error' : 'success'}
                                    />
                                }
                            />
                        ))}
                    </View>
                </View>
            ) : null}

            <View style={styles.inputSection}>
                <AppInput
                    label="새 시급 (원/시간)"
                    value={standardWage}
                    onChangeText={setStandardWage}
                    keyboardType="number-pad"
                    placeholder="예: 12000"
                    helper="2026년 최저시급은 ₩9,860 입니다 (가정)."
                />
            </View>

            <View style={styles.section}>
                <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>변경 이력</AppText>
                {history.length === 0 ? (
                    <AppCard variant="plain">
                        <AppText variant="bodyMd" tone="tertiary" style={styles.empty}>
                            변경 이력이 없어요. 시급 변경 시 자동으로 기록돼요.
                        </AppText>
                    </AppCard>
                ) : (
                    <View style={styles.list}>
                        {history.map((h, idx) => (
                            <AppListItem
                                key={idx}
                                title={h.effectiveFrom ?? '-'}
                                subtitle={h.reason ?? '시급 변경'}
                                right={<AppText variant="titleMd" tone="brand">{h.hourlyWage ? formatWage(h.hourlyWage) : '-'}</AppText>}
                            />
                        ))}
                    </View>
                )}
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.sm},
    heroAmount: {marginTop: spacing.xs},
    heroSub: {marginTop: spacing.xs},
    inputSection: {marginTop: spacing.xxl},
    section: {marginTop: spacing.xxl},
    sectionTitle: {marginBottom: spacing.md},
    empty: {lineHeight: 20},
    list: {gap: spacing.sm},
});

export default WageSettingsScreen;
