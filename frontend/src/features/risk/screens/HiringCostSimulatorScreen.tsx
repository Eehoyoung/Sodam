/* eslint-disable react-native/no-color-literals -- 히어로 그라디언트 위 반투명 데코 고정 색 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AmountText,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {gradient, radius, shadow, spacing} from '../../../theme/tokens';
import {fetchHiringCost, HiringCostEstimate} from '../services/riskService';

const DEFAULT_HOURLY_WAGE = '10030'; // 현행 최저임금 수준
const DEFAULT_WEEKLY_HOURS = '20';
const DEBOUNCE_MS = 500;

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

/**
 * 채용 비용 계산 — 시급·주당 근무시간을 넣으면 주휴수당·사업주 4대보험·퇴직금 적립까지
 * 포함한 "월 총 고용비용"을 추정해 보여준다.
 */
const HiringCostSimulatorScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();

    const [hourlyWage, setHourlyWage] = useState(DEFAULT_HOURLY_WAGE);
    const [weeklyHours, setWeeklyHours] = useState(DEFAULT_WEEKLY_HOURS);
    const [result, setResult] = useState<HiringCostEstimate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const requestSeq = useRef(0);

    const load = useCallback(async (wage: number, hours: number) => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError(false);
        try {
            const data = await fetchHiringCost(wage, hours);
            if (seq === requestSeq.current) {
                setResult(data);
            }
        } catch {
            if (seq === requestSeq.current) {
                setError(true);
                setResult(null);
            }
        } finally {
            if (seq === requestSeq.current) {
                setLoading(false);
            }
        }
    }, []);

    // 입력 변경 시 500ms 디바운스 후 재계산
    useEffect(() => {
        const wage = Number(hourlyWage);
        const hours = Number(weeklyHours);
        if (!Number.isFinite(wage) || wage <= 0 || !Number.isFinite(hours) || hours <= 0) {
            return;
        }
        const timer = setTimeout(() => {
            load(wage, hours);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [hourlyWage, weeklyHours, load]);

    const renderLine = (label: string, amount: number, strong?: boolean) => (
        <View style={styles.line} key={label}>
            <AppText variant={strong ? 'titleMd' : 'bodyMd'} tone={strong ? undefined : 'secondary'} weight={strong ? '700' : undefined}>
                {label}
            </AppText>
            <AppText variant={strong ? 'titleMd' : 'bodyMd'} weight={strong ? '700' : '600'}>
                {fmt(amount)}원
            </AppText>
        </View>
    );

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="채용 비용 계산" onBack={() => navigation.goBack()} />}>
            {/* ── 입력 ── */}
            <AppCard variant="flat">
                <View style={styles.inputRow}>
                    <AppInput
                        label="시급 (원)"
                        value={hourlyWage}
                        onChangeText={setHourlyWage}
                        keyboardType="number-pad"
                        containerStyle={styles.inputHalf}
                    />
                    <AppInput
                        label="주당 근무시간"
                        value={weeklyHours}
                        onChangeText={setWeeklyHours}
                        keyboardType="number-pad"
                        containerStyle={styles.inputHalf}
                    />
                </View>
            </AppCard>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <LoadingState title="계산 중" description="월 고용비용을 계산하고 있어요" />
                </View>
            ) : error ? (
                <AppCard variant="flat" style={styles.blockGap}>
                    <AppText variant="bodyMd" tone="secondary" center>
                        계산에 실패했어요. 입력값을 확인하고 잠시 후 다시 시도해 주세요.
                    </AppText>
                </AppCard>
            ) : result ? (
                <>
                    {/* ── 급여 ── */}
                    <AppCard variant="flat" style={styles.blockGap}>
                        <AppText variant="titleMd" weight="700" style={styles.cardTitle}>월 급여</AppText>
                        {renderLine('월 기본급', result.monthlyBaseWage)}
                        {result.weeklyAllowanceEligible ? (
                            renderLine('주휴수당', result.weeklyAllowance)
                        ) : (
                            <View style={styles.line}>
                                <AppText variant="bodyMd" tone="secondary">주휴수당</AppText>
                                <AppText variant="caption" tone="tertiary">
                                    주 15시간 미만 — 주휴수당 없음
                                </AppText>
                            </View>
                        )}
                        <View style={[styles.divider, {backgroundColor: c.divider}]} />
                        {renderLine('월 급여 합계', result.monthlyGrossWage, true)}
                    </AppCard>

                    {/* ── 사업주 4대보험 ── */}
                    <AppCard variant="flat" style={styles.blockGap}>
                        <AppText variant="titleMd" weight="700" style={styles.cardTitle}>사업주 부담 4대보험</AppText>
                        {renderLine('국민연금', result.employerInsurance.nationalPension)}
                        {renderLine('건강보험', result.employerInsurance.healthInsurance)}
                        {renderLine('고용보험', result.employerInsurance.employmentInsurance)}
                        {renderLine('산재보험', result.employerInsurance.industrialAccident)}
                        <View style={[styles.divider, {backgroundColor: c.divider}]} />
                        {renderLine('보험료 합계', result.employerInsurance.total, true)}
                    </AppCard>

                    {/* ── 퇴직금 ── */}
                    <AppCard variant="flat" style={styles.blockGap}>
                        <View style={styles.line}>
                            <View style={styles.severanceLabel}>
                                <Ionicons name="wallet-outline" size={16} color={c.textSecondary} />
                                <AppText variant="bodyMd" tone="secondary">퇴직금 월 적립</AppText>
                            </View>
                            <AppText variant="bodyMd" weight="600">{fmt(result.monthlySeveranceAccrual)}원</AppText>
                        </View>
                    </AppCard>

                    {/* ── 월 총 고용비용 히어로 ── */}
                    <LinearGradient
                        colors={gradient.brandStrong}
                        style={styles.heroCard}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}>
                        <View style={styles.heroDecor} />
                        <AppText variant="caption" tone="inverse" style={styles.heroLabel}>
                            월 총 고용비용
                        </AppText>
                        <AmountText size={32} tone="inverse">{fmt(result.monthlyTotalCost)}원</AmountText>
                        <AppText variant="caption" tone="inverse" style={styles.heroSub}>
                            급여 + 사업주 보험료 + 퇴직금 적립 포함
                        </AppText>
                    </LinearGradient>
                </>
            ) : null}

            <AppText variant="caption" tone="tertiary" center style={styles.footnote}>
                간이 추정치예요. 실제 보험료는 요율 변동·감면에 따라 달라질 수 있어요.
            </AppText>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    inputRow: {flexDirection: 'row', gap: spacing.md},
    inputHalf: {flex: 1},
    loadingWrap: {paddingVertical: spacing.xxl},
    blockGap: {marginTop: spacing.md},
    cardTitle: {marginBottom: spacing.sm},
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        gap: spacing.md,
    },
    divider: {height: 1, marginVertical: spacing.sm},
    severanceLabel: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},

    heroCard: {
        marginTop: spacing.lg,
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.lg,
    },
    heroDecor: {
        position: 'absolute', top: -24, right: -24,
        width: 120, height: 120,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 60,
    },
    heroLabel: {opacity: 0.8, marginBottom: spacing.xs},
    heroSub: {opacity: 0.75, marginTop: spacing.xs},

    footnote: {marginTop: spacing.lg, marginBottom: spacing.md},
});

export default HiringCostSimulatorScreen;
