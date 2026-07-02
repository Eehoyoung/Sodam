import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    HeroNumber,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchPayrollPreview, PayrollPreview} from '../services/payrollPreviewService';

type PreviewRoute = RouteProp<{Preview: {storeId: number; hourlyWage?: number}}, 'Preview'>;

const won = (n: number) => `${n.toLocaleString()}원`;

/**
 * A1 급여 미리보기(D0 aha). 시급·주 근로시간 → 주휴 포함 월 예상급여.
 * 영속화 없음(사장을 직원으로 등록하지 않음) — 추정치 면책 동반.
 */
const PayrollPreviewScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<PreviewRoute>();
    const c = useThemeColors();
    const {storeId, hourlyWage} = route.params;

    const [wage, setWage] = useState(hourlyWage ? String(hourlyWage) : '');
    const [hours, setHours] = useState('15');
    const [result, setResult] = useState<PayrollPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const w = parseInt(wage, 10);
        const h = parseFloat(hours);
        if (!w || w <= 0 || !h || h <= 0) {
            setError('시급과 주 근로시간을 정확히 입력해 주세요.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setResult(await fetchPayrollPreview(storeId, w, h));
        } catch {
            setError('계산에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="급여 미리보기" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label={result ? '다시 계산' : '예상 급여 보기'}
                    onPress={submit}
                    loading={loading}
                />
            }>
            <AppText variant="bodyMd" tone="secondary" style={styles.intro}>
                시급과 주 근로시간만 넣으면 주휴수당까지 포함한 한 달 예상 급여를 보여드려요.
            </AppText>

            <AppText variant="caption" tone="secondary" style={styles.label}>시급 (원)</AppText>
            <AppInput
                value={wage}
                onChangeText={setWage}
                keyboardType="number-pad"
                placeholder="예: 10030"
            />

            <AppText variant="caption" tone="secondary" style={styles.label}>주 근로시간</AppText>
            <AppInput
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
                placeholder="예: 15"
            />

            {error ? (
                <AppText variant="caption" tone="error" style={styles.error}>{error}</AppText>
            ) : null}

            {result ? (
                <View style={styles.resultWrap}>
                    <HeroNumber
                        label="이번 달 예상 급여 (세전)"
                        value={won(result.monthlyGross)}
                        sub={result.weeklyAllowanceEligible
                            ? `주휴수당 ${won(result.monthlyAllowance)} 포함`
                            : '주 15시간 미만이라 주휴수당은 없어요'}
                        accent
                    />
                    <AppCard variant="flat" style={styles.breakdown}>
                        <Row label="월 기본급" value={won(result.monthlyBasic)} c={c} />
                        <Row label="월 주휴수당" value={won(result.monthlyAllowance)} c={c} />
                        <View style={[styles.divider, {backgroundColor: c.divider}]} />
                        <Row label="세전 합계" value={won(result.monthlyGross)} c={c} strong />
                    </AppCard>
                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {result.disclaimer}
                    </AppText>
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const Row: React.FC<{label: string; value: string; c: ReturnType<typeof useThemeColors>; strong?: boolean}> = ({
    label,
    value,
    strong,
}) => (
    <View style={styles.row}>
        <AppText variant={strong ? 'titleMd' : 'bodyMd'} tone={strong ? 'primary' : 'secondary'}>
            {label}
        </AppText>
        <AppText
            variant={strong ? 'titleMd' : 'bodyMd'}
            style={styles.rowValue}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {value}
        </AppText>
    </View>
);

const styles = StyleSheet.create({
    intro: {marginBottom: spacing.lg},
    label: {marginTop: spacing.md, marginBottom: spacing.xs},
    error: {marginTop: spacing.sm},
    resultWrap: {marginTop: spacing.xl},
    breakdown: {marginTop: spacing.lg},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs},
    rowValue: {flexShrink: 1, marginLeft: spacing.md},
    divider: {height: 1, marginVertical: spacing.sm},
    disclaimer: {marginTop: spacing.md},
});

export default PayrollPreviewScreen;
