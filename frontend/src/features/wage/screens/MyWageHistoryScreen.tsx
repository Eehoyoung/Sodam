import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import myWageService, {MyWageHistory, MyWageHistoryEntry} from '../services/myWageService';

/**
 * B1 내 시급 이력 (E-NEW-02). 직원 본인 전용 읽기.
 * 현재 시급 HeroNumber + 변경 타임라인(날짜·금액·사유). 사장 메모/변경자는 BE 응답에 없음.
 */
const MyWageHistoryScreen: React.FC = () => {
    const navigation = useNavigation();

    const [data, setData] = useState<MyWageHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await myWageService.getMyWageHistory());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <ScreenContainer scroll header={<AppHeader title="내 시급 이력" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState title="불러오는 중" description="시급 이력을 불러오고 있어요." />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : data ? (
                <View>
                    <HeroNumber
                        label="현재 시급"
                        value={data.currentHourlyWage !== null ? `${formatWon(data.currentHourlyWage)}원` : '미설정'}
                        sub="매장 기본 또는 개별 시급이 적용돼요."
                        accent
                    />

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        시급 변경 이력
                    </AppText>

                    {data.history.length === 0 ? (
                        <EmptyState
                            title="아직 변경 이력이 없어요"
                            description="시급이 바뀌면 여기에 날짜와 금액이 기록돼요."
                        />
                    ) : (
                        <AppCard variant="flat">
                            {data.history.map((h, idx) => (
                                <WageRow
                                    key={`${h.effectiveFrom}-${h.scope}-${idx}`}
                                    entry={h}
                                    last={idx === data.history.length - 1}
                                />
                            ))}
                        </AppCard>
                    )}
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const WageRow: React.FC<{entry: MyWageHistoryEntry; last: boolean}> = ({entry, last}) => {
    const c = useThemeColors();
    const isOverride = entry.scope === 'EMPLOYEE_OVERRIDE';
    return (
        <View style={[styles.row, {borderBottomColor: c.divider}, last && styles.rowLast]}>
            <View style={styles.rowTop}>
                <AppText variant="titleMd">{`${formatWon(entry.hourlyWage)}원`}</AppText>
                <AppBadge
                    label={isOverride ? '개별 시급' : '매장 기본'}
                    tone={isOverride ? 'info' : 'neutral'}
                />
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.date}>
                {`${formatDate(entry.effectiveFrom)}부터 적용`}
            </AppText>
            {entry.reason ? (
                <AppText variant="bodyMd" tone="secondary" style={styles.reason}>
                    {entry.reason}
                </AppText>
            ) : null}
        </View>
    );
};

function formatWon(amount: number): string {
    return new Intl.NumberFormat('ko-KR').format(amount);
}

function formatDate(iso: string): string {
    // YYYY-MM-DD → YYYY년 M월 D일
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) {
        return iso;
    }
    return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

const styles = StyleSheet.create({
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    row: {paddingVertical: spacing.md, borderBottomWidth: 1},
    rowLast: {borderBottomWidth: 0},
    rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    date: {marginTop: spacing.xs},
    reason: {marginTop: spacing.xs},
});

export default MyWageHistoryScreen;
