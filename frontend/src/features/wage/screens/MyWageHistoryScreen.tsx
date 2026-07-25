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
    LoadingState,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import myWageService, {MyWageHistory, MyWageHistoryEntry} from '../services/myWageService';

/**
 * W7 MyWageHistoryScreen(E-NEW-02) — v3 시안(sodam-v3-11-taxwage.html) 1:1.
 *
 * MoneyCard(현재 시급) + section-label "시급 변경 이력" + list-item 카드별 이력(상단 행: 시급+구분배지,
 * 메타 한 줄: 적용일·사유 통합). 직원 본인 전용 읽기. 사장 메모/변경자는 BE 응답에 없음.
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
                    <MoneyCard
                        label="현재 시급"
                        value={data.currentHourlyWage !== null ? `${formatWon(data.currentHourlyWage)}원` : '미설정'}
                        sub="매장 기본 또는 개별 시급이 적용돼요."
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
                        <View style={styles.list}>
                            {data.history.map((h, idx) => (
                                <WageRow key={`${h.effectiveFrom}-${h.scope}-${idx}`} entry={h} />
                            ))}
                        </View>
                    )}
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const WageRow: React.FC<{entry: MyWageHistoryEntry}> = ({entry}) => {
    const isOverride = entry.scope === 'EMPLOYEE_OVERRIDE';
    return (
        <AppCard variant="flat">
            <View style={styles.rowTop}>
                <AppText variant="titleMd">{`${formatWon(entry.hourlyWage)}원`}</AppText>
                <AppBadge
                    label={isOverride ? '개별 시급' : '매장 기본'}
                    tone={isOverride ? 'success' : 'neutral'}
                />
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.date}>
                {`${formatDate(entry.effectiveFrom)}부터 적용`}
                {entry.reason ? ` · ${entry.reason}` : ''}
            </AppText>
        </AppCard>
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
    list: {gap: spacing.sm},
    rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    date: {marginTop: spacing.xs},
});

export default MyWageHistoryScreen;
