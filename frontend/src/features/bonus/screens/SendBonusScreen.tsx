import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {
    BonusPaymentTiming,
    createBonus,
    fetchBonusesForEmployee,
    PayrollBonus,
} from '../services/bonusService';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';

type Route = RouteProp<
    {B: {storeId: number; employeeId: number; employeeName?: string}},
    'B'
>;

function todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}${m}${day}`;
}

/**
 * 즉시 보너스 지급 — "오늘 바빠서 1만원 더" 사장 전용.
 *
 * 정책: 근로소득 과세 대상(매장 세금정책 그대로 적용) · 통상임금·최저임금 불산입(임시·포상적 금품).
 * 급여합산형(INCLUDED_IN_PAYROLL)은 다음 급여 정산 시 자동으로 명세서에 합산되고, 즉시현금형은
 * 기록만 남는다(급여 총액엔 미포함 — 중복 지급 방지).
 */
const SendBonusScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [items, setItems] = useState<PayrollBonus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [bonusDate, setBonusDateValue] = useState(todayStr());
    const setBonusDate = (value: string) => setBonusDateValue(sanitizeDateDigits(value));
    const [amount, setAmount] = useState('10000');
    const [reason, setReason] = useState('');
    const [timingIdx, setTimingIdx] = useState(1); // 기본: 다음 급여에 합산
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const paymentTiming: BonusPaymentTiming = timingIdx === 0 ? 'IMMEDIATE_CASH' : 'INCLUDED_IN_PAYROLL';

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await fetchBonusesForEmployee(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const save = async () => {
        if (saving) {
            return;
        }
        if (!isValidDateDigits(bonusDate)) {
            setFormError(DATE_DIGITS_HELPER);
            return;
        }
        const amountNum = Number(amount.replace(/[^0-9]/g, ''));
        if (!amountNum || amountNum <= 0) {
            setFormError('보너스 금액을 입력해 주세요.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await createBonus(storeId, {
                employeeId,
                bonusDate: dateDigitsToIso(bonusDate),
                amount: amountNum,
                reason: reason.trim() || undefined,
                paymentTiming,
            });
            setReason('');
            AppToast.success(
                paymentTiming === 'IMMEDIATE_CASH'
                    ? '보너스 지급을 기록했어요.'
                    : '보너스를 등록했어요. 다음 급여 정산 시 자동으로 합산돼요.',
            );
            await load();
        } catch (e: unknown) {
            const msg =
                typeof e === 'object' && e !== null && 'response' in e
                    ? (e as {response?: {data?: {message?: string}}}).response?.data?.message
                    : undefined;
            setFormError(msg ?? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={
                <AppHeader
                    title={employeeName ? `${employeeName} · 즉시 보너스` : '즉시 보너스'}
                    onBack={() => navigation.goBack()}
                />
            }
            footer={<AppButton label="보너스 지급하기" onPress={save} loading={saving} />}>
            <View style={[styles.notice, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                    비정기 포상금은 근로소득 과세 대상이지만 통상임금·최저임금 계산에는 포함되지 않아요.
                    "다음 급여에 합산"을 선택하면 이번 정산에 자동으로 더해져요.
                </AppText>
            </View>

            <AppCard variant="flat" style={styles.formCard}>
                <AppText variant="caption" tone="secondary" style={styles.label}>지급 결정일</AppText>
                <AppInput
                    value={bonusDate}
                    onChangeText={setBonusDate}
                    placeholder="20260701"
                    keyboardType="number-pad"
                    maxLength={8}
                    helper={DATE_DIGITS_HELPER}
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>금액(원)</AppText>
                <AppInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="예: 10000"
                    keyboardType="number-pad"
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>지급 방식</AppText>
                <SegmentedControl
                    options={['즉시 현금 지급', '다음 급여에 합산']}
                    value={timingIdx}
                    onChange={setTimingIdx}
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>사유(선택)</AppText>
                <AppInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="예: 마감 도와줘서 감사 보너스"
                    maxLength={300}
                />

                {formError ? (
                    <AppText variant="caption" tone="error" style={styles.error}>{formError}</AppText>
                ) : null}
            </AppCard>

            <AppText variant="titleMd" style={styles.listTitle}>지급 이력</AppText>

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="보너스 이력을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="gift-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="지급한 보너스가 없어요"
                    description="즉흥적으로 보너스를 준 날, 위에서 바로 기록해 보세요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.row}>
                                <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                    <Ionicons name="gift-outline" size={20} color={c.textSecondary} />
                                </View>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd" numberOfLines={1}>
                                        {it.bonusDate} · {it.amount.toLocaleString('ko-KR')}원
                                    </AppText>
                                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                        {it.reason ? it.reason : '사유 없음'}
                                    </AppText>
                                </View>
                                <AppBadge
                                    label={it.paymentTiming === 'IMMEDIATE_CASH' ? '즉시 현금' : (it.consumed ? '급여 반영됨' : '합산 대기')}
                                    tone={it.paymentTiming === 'IMMEDIATE_CASH' ? 'neutral' : (it.consumed ? 'success' : 'warning')}
                                />
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    notice: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: 14},
    noticeText: {flex: 1, lineHeight: 18},
    formCard: {marginTop: spacing.lg},
    label: {marginTop: spacing.md, marginBottom: spacing.xs},
    error: {marginTop: spacing.sm},
    listTitle: {marginTop: spacing.xxl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1},
});

export default SendBonusScreen;
