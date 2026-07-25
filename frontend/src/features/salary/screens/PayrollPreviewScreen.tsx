import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchPayrollPreview, PayrollPreview} from '../services/payrollPreviewService';

type PreviewRoute = RouteProp<{Preview: {storeId: number; hourlyWage?: number}}, 'Preview'>;

const won = (n: number) => `${n.toLocaleString()}원`;

/**
 * W1 PayrollPreviewScreen(A1, D0 aha) — v3 시안(sodam-v3-11-taxwage.html) 1:1.
 *
 * info-card 안내 + 시급·주 근로시간 필드 + CTA "예상 급여 보기" + MoneyCard(이번 달 예상 급여) +
 * 평이한 2행(월 기본급/월 주휴수당, 카드·합계행 없이 시안과 동일). 영속화 없음(사장을 직원으로 등록하지 않음) — 추정치 면책 동반.
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
            <AppCard variant="flat" style={styles.intro}>
                <AppText variant="bodyMd" tone="secondary">
                    시급과 주 근로시간만 넣으면 주휴수당까지 포함한 한 달 예상 급여를 보여드려요.
                </AppText>
            </AppCard>

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
                    <MoneyCard
                        label="이번 달 예상 급여 (세전)"
                        value={won(result.monthlyGross)}
                        sub={result.weeklyAllowanceEligible
                            ? `주휴수당 ${won(result.monthlyAllowance)} 포함`
                            : '주 15시간 미만이라 주휴수당은 없어요'}
                    />
                    <View style={styles.breakdown}>
                        <Row label="월 기본급" value={won(result.monthlyBasic)} c={c} />
                        <Row label="월 주휴수당" value={won(result.monthlyAllowance)} c={c} />
                    </View>
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
    disclaimer: {marginTop: spacing.md},
});

export default PayrollPreviewScreen;
