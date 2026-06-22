import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchMinorGuard, MinorGuard} from '../services/minorGuardService';

type Route = RouteProp<
    {M: {storeId: number; employeeId: number; employeeName?: string}},
    'M'
>;

/**
 * 연소근로자(만 18세 미만) 확인 (L-NEW-01) — 사장 보호 기능.
 * 미성년이면 경고 카드(만 나이·1일7h/주35h·야간 제한·친권자 동의 필요)와 안내,
 * 미성년이 아니면 "해당 없음" 안내를 보여준다.
 */
/** A4 — 친권자(법정대리인) 동의 표준 안내. 원본 PII 는 앱에 저장하지 않음을 명시. */
const GUARDIAN_CONSENT_NOTICE =
    '만 18세 미만은 친권자(법정대리인) 동의가 필요해요. 친권자 동의서·가족관계증명서는 매장에 보관할 의무가 있어요. 원본은 앱에 저장하지 않으니, 종이 또는 사장님이 보관하는 안전한 곳에 두세요.';
const MinorGuardScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [data, setData] = useState<MinorGuard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchMinorGuard(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useEffect(() => {
        load();
    }, [load]);

    const title = employeeName ? `${employeeName} · 연소근로자 확인` : '연소근로자 확인';

    return (
        <ScreenContainer scroll header={<AppHeader title="연소근로자 확인" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState title="확인하는 중" description="직원 정보를 불러오고 있어요" />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : data?.minor ? (
                <View>
                    <AppText variant="headingSm" style={styles.pageTitle}>
                        {title}
                    </AppText>

                    <AppCard variant="flat" style={[styles.warnCard, {backgroundColor: c.brandPrimarySoft}]}>
                        <View style={styles.warnRow}>
                            <Ionicons name="warning" size={22} color={c.warning} />
                            <AppText variant="titleMd" style={styles.flex}>
                                {data.age !== null
                                    ? `만 ${data.age}세 — 연소근로자예요`
                                    : '연소근로자예요'}
                            </AppText>
                        </View>
                        <AppText variant="bodyMd" tone="secondary" style={styles.warnBody}>
                            {data.guidance}
                        </AppText>
                    </AppCard>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        지켜야 할 기준
                    </AppText>
                    <AppCard variant="flat">
                        <Rule
                            icon="time-outline"
                            label="근로시간 한도"
                            value={`1일 ${data.dailyHourLimit}시간 · 1주 ${data.weeklyHourLimit}시간`}
                        />
                        <Rule
                            icon="moon-outline"
                            label="야간·휴일근로"
                            value={
                                data.nightWorkRestricted
                                    ? '밤 10시~새벽 6시·휴일근로 원칙 금지 (인가+동의 필요)'
                                    : '제한 없음'
                            }
                        />
                        <Rule
                            icon="document-text-outline"
                            label="친권자 동의"
                            value={
                                data.consentRequired
                                    ? '동의서·가족관계증명서 매장 비치 필요'
                                    : '불필요'
                            }
                            last
                        />
                    </AppCard>

                    {data.consentRequired ? (
                        <AppCard variant="flat" style={[styles.consentCard, {backgroundColor: c.surfaceWarm}]}>
                            <View style={styles.warnRow}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={c.brandPrimary} />
                                <AppText variant="titleMd" style={styles.flex}>
                                    친권자 동의 안내
                                </AppText>
                            </View>
                            <AppText variant="bodyMd" tone="secondary" style={styles.warnBody}>
                                {GUARDIAN_CONSENT_NOTICE}
                            </AppText>
                        </AppCard>
                    ) : null}

                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            ) : data ? (
                <EmptyState
                    glyph={<Ionicons name="checkmark" size={26} color={c.textInverse} />}
                    markColor={c.success}
                    title="연소근로자가 아니에요"
                    description={
                        data.age !== null
                            ? `만 ${data.age}세 직원이라 연소근로자 보호 규정은 해당되지 않아요.`
                            : data.guidance
                    }
                />
            ) : null}
        </ScreenContainer>
    );
};

const Rule: React.FC<{
    icon: string;
    label: string;
    value: string;
    last?: boolean;
}> = ({icon, label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.ruleRow, !last && styles.ruleDivider, !last && {borderBottomColor: c.divider}]}>
            <Ionicons name={icon} size={18} color={c.textSecondary} style={styles.ruleIcon} />
            <View style={styles.flex}>
                <AppText variant="caption" tone="secondary">
                    {label}
                </AppText>
                <AppText variant="bodyMd" style={styles.ruleValue}>
                    {value}
                </AppText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    pageTitle: {marginBottom: spacing.md},
    flex: {flex: 1},
    warnCard: {marginTop: spacing.xs},
    consentCard: {marginTop: spacing.md},
    warnRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    warnBody: {marginTop: spacing.sm},
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    ruleRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md},
    ruleDivider: {borderBottomWidth: 1},
    ruleIcon: {marginTop: 2},
    ruleValue: {marginTop: 2},
    disclaimer: {marginTop: spacing.lg},
});

export default MinorGuardScreen;
