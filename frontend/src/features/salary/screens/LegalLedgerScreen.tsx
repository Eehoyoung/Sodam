import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {
    EmployeeRoster,
    WageLedger,
    fetchEmployeeRoster,
    fetchWageLedger,
} from '../services/ledgerService';

type Route = RouteProp<{S: {storeId: number}}, 'S'>;

const won = (n: number) => `${n.toLocaleString()}원`;
const NOW = new Date();

/**
 * B8 법정 장부 — 임금대장(§48①)·근로자명부(§41). 근로감독·체불진정 1순위 요구 서류. 사장 전용.
 * 자료정리까지만(법정 서식 보완은 사장 몫). 주민번호 미저장. 면책 동반.
 */
const LegalLedgerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [tab, setTab] = useState(0); // 0 임금대장 1 근로자명부
    const [year, setYear] = useState(NOW.getFullYear());
    const [month, setMonth] = useState(NOW.getMonth() + 1);

    const [wage, setWage] = useState<WageLedger | null>(null);
    const [roster, setRoster] = useState<EmployeeRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            if (tab === 0) {
                setWage(await fetchWageLedger(storeId, year, month));
            } else {
                setRoster(await fetchEmployeeRoster(storeId));
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, tab, year, month]);

    useEffect(() => {
        load();
    }, [load]);

    const shiftMonth = (delta: number) => {
        const base = new Date(year, month - 1 + delta, 1);
        setYear(base.getFullYear());
        setMonth(base.getMonth() + 1);
    };

    const renderWage = () => {
        if (!wage || wage.employeeCount === 0) {
            return (
                <EmptyState
                    title="이 달 급여가 없어요"
                    description={`${year}년 ${month}월에 발급된 급여 명세가 있으면 임금대장을 만들어드려요.`}
                />
            );
        }
        return (
            <View>
                <HeroNumber
                    label={`${year}년 ${month}월 총 지급액`}
                    value={won(wage.totalGross)}
                    sub={`직원 ${wage.employeeCount}명 · 실수령 합계 ${won(wage.totalNet)}`}
                    accent
                />
                <View style={styles.list}>
                    {wage.items.map(it => (
                        <AppCard key={it.employeeId} variant="flat">
                            <AppText variant="titleMd">{it.employeeName}</AppText>
                            <LedgerRow label="기본급" value={won(it.regularWage)} />
                            <LedgerRow label="연장수당" value={won(it.overtimeWage)} />
                            <LedgerRow label="야간수당" value={won(it.nightWorkWage)} />
                            <LedgerRow label="휴일수당" value={won(it.holidayWorkWage)} />
                            <LedgerRow label="주휴수당" value={won(it.weeklyAllowance)} />
                            <View style={[styles.divider, {backgroundColor: c.divider}]} />
                            <LedgerRow label="총 지급액" value={won(it.grossWage)} strong />
                            <LedgerRow label="공제 합계" value={won(it.deduction)} />
                            <LedgerRow label="실수령액" value={won(it.netWage)} strong />
                        </AppCard>
                    ))}
                </View>
                <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                    {wage.disclaimer}
                </AppText>
            </View>
        );
    };

    const renderRoster = () => {
        if (!roster || roster.employeeCount === 0) {
            return (
                <EmptyState
                    title="등록된 직원이 없어요"
                    description="직원이 매장에 연결되면 근로자명부를 만들어드려요."
                />
            );
        }
        return (
            <View>
                <HeroNumber
                    label="근로자명부"
                    value={`${roster.employeeCount}명`}
                    sub="입사일·시급·재직상태"
                />
                <View style={styles.list}>
                    {roster.items.map(it => (
                        <AppCard key={it.employeeId ?? it.employeeName} variant="flat">
                            <View style={styles.rosterHead}>
                                <AppText variant="titleMd" style={styles.flex}>{it.employeeName}</AppText>
                                <View
                                    style={[
                                        styles.statusChip,
                                        {backgroundColor: it.active ? c.successBg : c.surfaceMuted},
                                    ]}>
                                    <AppText
                                        variant="caption"
                                        tone={it.active ? 'success' : 'tertiary'}>
                                        {it.active ? '재직' : '퇴사'}
                                    </AppText>
                                </View>
                            </View>
                            <LedgerRow label="입사일" value={it.hireDate ?? '미등록'} />
                            <LedgerRow
                                label="시급"
                                value={it.hourlyWage !== null ? won(it.hourlyWage) : '미등록'}
                            />
                        </AppCard>
                    ))}
                </View>
                <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                    {roster.disclaimer}
                </AppText>
            </View>
        );
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="법정 장부" onBack={() => navigation.goBack()} />}>
            <SegmentedControl
                options={['임금대장', '근로자명부']}
                value={tab}
                onChange={setTab}
            />

            {tab === 0 ? (
                <View style={styles.monthBar}>
                    <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={styles.monthBtn}>
                        <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
                    </Pressable>
                    <AppText variant="titleMd">{`${year}년 ${month}월`}</AppText>
                    <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.monthBtn}>
                        <Ionicons name="chevron-forward" size={22} color={c.textSecondary} />
                    </Pressable>
                </View>
            ) : null}

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : tab === 0 ? (
                renderWage()
            ) : (
                renderRoster()
            )}
        </ScreenContainer>
    );
};

interface LedgerRowProps {
    label: string;
    value: string;
    strong?: boolean;
}

const LedgerRow: React.FC<LedgerRowProps> = ({label, value, strong}) => (
    <View style={styles.row}>
        <AppText variant="caption" tone="secondary">{label}</AppText>
        <AppText
            variant={strong ? 'titleMd' : 'bodyMd'}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {value}
        </AppText>
    </View>
);

const styles = StyleSheet.create({
    monthBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.lg,
    },
    monthBtn: {padding: spacing.xs},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    divider: {height: 1, marginVertical: spacing.sm},
    rosterHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    statusChip: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999},
    disclaimer: {marginTop: spacing.md},
});

export default LegalLedgerScreen;
