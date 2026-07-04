import React, {useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
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
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {DailySale, fetchRecentSales, upsertDailySales} from '../services/salesService';
import {
    DATE_DIGITS_HELPER,
    dateDigitsToIso,
    isValidDateDigits,
    sanitizeDateDigits,
} from '../../../common/utils/dateTimeInput';

type Route = RouteProp<{DailySales: {storeId: number}}, 'DailySales'>;

const RECENT_DAYS = 7;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function todayDigits(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}${m}${day}`;
}

/** 오늘부터 과거로 n일치 ISO(YYYY-MM-DD) 날짜 배열. */
function recentIsoDates(n: number): string[] {
    const out: string[] = [];
    const base = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        out.push(`${d.getFullYear()}-${m}-${day}`);
    }
    return out;
}

function isoToLabel(iso: string): string {
    const [, m, d] = iso.split('-');
    const date = new Date(Number(iso.slice(0, 4)), Number(m) - 1, Number(d));
    return `${Number(m)}월 ${Number(d)}일 (${WEEKDAYS[date.getDay()]})`;
}

function formatAmountInput(value: string): string {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) {
        return '';
    }
    return Number(digits).toLocaleString('ko-KR');
}

/**
 * 일일 매출 입력 — 사장이 하루 매출을 기록. 같은 날 재저장하면 서버가 upsert 로 수정한다.
 * 최근 7일 중 미입력 날짜를 탭하면 폼에 프리필되어 바로 채울 수 있다.
 */
const DailySalesEntryScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [recent, setRecent] = useState<DailySale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [dateDigits, setDateDigitsValue] = useState(todayDigits());
    const setDateDigits = (value: string) => setDateDigitsValue(sanitizeDateDigits(value));
    const [amount, setAmount] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setRecent(await fetchRecentSales(storeId, RECENT_DAYS));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const save = async () => {
        if (saving) {
            return;
        }
        if (!isValidDateDigits(dateDigits)) {
            setFormError(DATE_DIGITS_HELPER);
            return;
        }
        const amountNum = Number(amount.replace(/[^0-9]/g, ''));
        if (!amountNum || amountNum <= 0) {
            setFormError('매출 금액을 입력해 주세요.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await upsertDailySales(storeId, {
                saleDate: dateDigitsToIso(dateDigits),
                amount: amountNum,
            });
            AppToast.success('매출을 저장했어요. 같은 날짜로 다시 저장하면 수정돼요.');
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

    // 오늘부터 7일을 FE 에서 만들어 서버 응답과 머지 — 미입력 날짜도 행으로 보여준다.
    const salesByDate = new Map(recent.map(s => [s.saleDate, s.amount]));
    const rows = recentIsoDates(RECENT_DAYS).map(iso => ({
        iso,
        amount: salesByDate.has(iso) ? salesByDate.get(iso)! : null,
    }));

    const prefill = (iso: string) => {
        setDateDigitsValue(sanitizeDateDigits(iso));
        setFormError(null);
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="일일 매출 입력" onBack={() => navigation.goBack()} />}
            footer={<AppButton label="매출 저장" onPress={save} loading={saving} />}>
            <View style={[styles.notice, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                    하루 매출을 기록하면 인건비율을 자동으로 계산해 드려요.
                    같은 날짜로 다시 저장하면 금액이 수정돼요.
                </AppText>
            </View>

            <AppCard variant="flat" style={styles.formCard}>
                <AppText variant="caption" tone="secondary" style={styles.label}>매출 일자</AppText>
                <AppInput
                    value={dateDigits}
                    onChangeText={setDateDigits}
                    placeholder={todayDigits()}
                    keyboardType="number-pad"
                    maxLength={8}
                    helper={DATE_DIGITS_HELPER}
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>매출 금액(원)</AppText>
                <AppInput
                    value={amount}
                    onChangeText={v => setAmount(formatAmountInput(v))}
                    placeholder="예: 450,000"
                    keyboardType="number-pad"
                />

                {formError ? (
                    <AppText variant="caption" tone="error" style={styles.error}>{formError}</AppText>
                ) : null}
            </AppCard>

            <AppText variant="titleMd" style={styles.listTitle}>최근 7일</AppText>

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="최근 매출을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <View style={styles.list}>
                    {rows.map(row => (
                        <TouchableOpacity key={row.iso} activeOpacity={0.75} onPress={() => prefill(row.iso)}>
                            <AppCard variant="flat">
                                <View style={styles.row}>
                                    <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                        <Ionicons
                                            name={row.amount !== null ? 'cash-outline' : 'create-outline'}
                                            size={20}
                                            color={c.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" numberOfLines={1}>{isoToLabel(row.iso)}</AppText>
                                        <AppText variant="caption" tone="tertiary">{row.iso}</AppText>
                                    </View>
                                    {row.amount !== null ? (
                                        <AppText variant="titleMd" weight="700">
                                            {row.amount.toLocaleString('ko-KR')}원
                                        </AppText>
                                    ) : (
                                        <AppBadge label="미입력" tone="warning" />
                                    )}
                                </View>
                            </AppCard>
                        </TouchableOpacity>
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

export default DailySalesEntryScreen;
