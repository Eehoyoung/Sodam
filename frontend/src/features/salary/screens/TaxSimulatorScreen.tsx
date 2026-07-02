import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
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
import {fetchTaxSimulation, TaxSimulation} from '../services/taxSimulatorService';

const won = (n: number) => `${n.toLocaleString()}원`;

/**
 * T-NEW-05 세무 시뮬레이터 — 매출·지출 입력 → 예상 종합소득세(참고용). 저장 없음.
 */
const TaxSimulatorScreen: React.FC = () => {
    const navigation = useNavigation();
    const c = useThemeColors();

    const [income, setIncome] = useState('');
    const [expenses, setExpenses] = useState('');
    const [result, setResult] = useState<TaxSimulation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const inc = parseInt(income, 10);
        const exp = expenses ? parseInt(expenses, 10) : 0;
        if (!inc || inc <= 0) {
            setError('연 매출(수입)을 입력해 주세요.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setResult(await fetchTaxSimulation(inc, exp));
        } catch {
            setError('계산에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세무 시뮬레이터" onBack={() => navigation.goBack()} />}
            footer={<AppButton label={result ? '다시 계산' : '예상 세금 계산'} onPress={submit} loading={loading} />}>
            <AppText variant="bodyMd" tone="secondary" style={styles.intro}>
                연 매출과 경비를 넣으면 예상 종합소득세를 대략 알려드려요.
            </AppText>

            <AppText variant="caption" tone="secondary" style={styles.label}>연 매출 (원)</AppText>
            <AppInput value={income} onChangeText={setIncome} keyboardType="number-pad" placeholder="예: 60000000" />

            <AppText variant="caption" tone="secondary" style={styles.label}>연 경비 (원, 선택)</AppText>
            <AppInput value={expenses} onChangeText={setExpenses} keyboardType="number-pad" placeholder="예: 10000000" />

            {error ? (
                <AppText variant="caption" tone="error" style={styles.error}>{error}</AppText>
            ) : null}

            {result ? (
                <View style={styles.resultWrap}>
                    <HeroNumber
                        label="예상 종합소득세"
                        value={won(result.estimatedTax)}
                        sub={`과세표준 ${won(result.taxableIncome)} · 실효세율 ${result.effectiveRate}%`}
                        accent
                    />
                    <AppCard variant="flat" style={styles.breakdown}>
                        <Row label="연 매출" value={won(result.income)} />
                        <Row label="연 경비" value={won(result.expenses)} />
                        <View style={[styles.divider, {backgroundColor: c.divider}]} />
                        <Row label="과세표준" value={won(result.taxableIncome)} strong />
                    </AppCard>
                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {result.disclaimer}
                    </AppText>
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const Row: React.FC<{label: string; value: string; strong?: boolean}> = ({label, value, strong}) => (
    <View style={styles.row}>
        <AppText variant={strong ? 'titleMd' : 'bodyMd'} tone={strong ? 'primary' : 'secondary'}>{label}</AppText>
        <AppText variant={strong ? 'titleMd' : 'bodyMd'} numberOfLines={1} adjustsFontSizeToFit style={styles.rowValue}>
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

export default TaxSimulatorScreen;
