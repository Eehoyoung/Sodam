import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import myLeaveService, {MyLeaveBalance} from '../services/myLeaveService';
import {formatConsumedDays as formatDays} from '../types';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import {useEmployeeStoreIds} from '../../store/hooks/useEmployeeStoreIds';

/**
 * B2 내 잔여 연차 (E-NEW-03). 직원 본인 전용 읽기·추정.
 * 잔여 HeroNumber + 발생/사용 + 게이지 + 면책. 5인 미만이면 미적용 안내.
 *
 * v3 시안(sodam-v3-09-schedule.html S7) 정렬: 히어로 숫자·게이지·범례를 하나의 spot-card
 * (AppCard variant="spot")로 결합, 게이지를 사용/잔여 2색 세그먼트로 표시, 범례를 사용·잔여
 * 2항목(색 점 포함)으로 축소.
 */
const MyLeaveBalanceScreen: React.FC = () => {
    const navigation = useNavigation();
    const storeIds = useEmployeeStoreIds();

    const [data, setData] = useState<MyLeaveBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await myLeaveService.getMyLeaveBalance());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useStoreLiveSync(storeIds, event => {
        if (event.type === 'TIME_OFF_CHANGED') {
            load();
        }
    });

    return (
        <ScreenContainer scroll header={<AppHeader title="내 연차" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState title="불러오는 중" description="연차 정보를 불러오고 있어요." />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : data ? (
                <Content data={data} />
            ) : null}
        </ScreenContainer>
    );
};

const Content: React.FC<{data: MyLeaveBalance}> = ({data}) => {
    const c = useThemeColors();

    if (!data.fiveOrMoreApplicable) {
        return (
            <View>
                <HeroNumber label="잔여 연차" value="해당 없음" sub="5인 미만 사업장은 연차가 적용되지 않아요." />
                <AppCard variant="warm" style={styles.noticeCard}>
                    <AppText variant="titleMd">연차 미적용 사업장이에요</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.noticeBody}>
                        근로기준법상 상시근로자 5인 미만 사업장은 연차유급휴가가 적용되지 않아요.
                    </AppText>
                </AppCard>
                <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                    {data.disclaimer}
                </AppText>
            </View>
        );
    }

    const usedRatio = data.entitledDays > 0 ? Math.min(data.usedDays / data.entitledDays, 1) : 0;
    const remainingRatio = Math.max(0, 1 - usedRatio);

    return (
        <View>
            {/* v3 시안(S7): 잔여 히어로 + 게이지 + 범례를 하나의 spot-card 로 결합 */}
            <AppCard variant="spot" style={styles.spotCard}>
                <HeroNumber
                    label="잔여 연차"
                    value={`${formatDays(data.remainingDays)}일`}
                    sub={`발생 ${formatDays(data.entitledDays)}일 중 ${formatDays(data.usedDays)}일 사용`}
                    accent
                />
                <View style={[styles.track, {backgroundColor: c.surfaceMuted}]}>
                    <View style={[styles.fill, {backgroundColor: c.brandPrimary, width: `${usedRatio * 100}%`}]} />
                    <View style={[styles.fill, {backgroundColor: c.success, width: `${remainingRatio * 100}%`}]} />
                </View>
                <View style={styles.legendRow}>
                    <LegendItem dotColor={c.brandPrimary} label="사용" value={`${formatDays(data.usedDays)}일`} />
                    <LegendItem dotColor={c.success} label="잔여" value={`${formatDays(data.remainingDays)}일`} emphasize />
                </View>
            </AppCard>

            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                {data.disclaimer}
            </AppText>
        </View>
    );
};

const LegendItem: React.FC<{label: string; value: string; dotColor: string; emphasize?: boolean}> = ({
    label,
    value,
    dotColor,
    emphasize,
}) => (
    <View style={styles.legendItem}>
        <View style={styles.legendLabelRow}>
            <View style={[styles.legendDot, {backgroundColor: dotColor}]} />
            <AppText variant="caption" tone="secondary">{label}</AppText>
        </View>
        <AppText variant="titleMd" tone={emphasize ? 'brand' : 'primary'} style={styles.legendValue}>
            {value}
        </AppText>
    </View>
);

const styles = StyleSheet.create({
    noticeCard: {marginTop: spacing.lg},
    noticeBody: {marginTop: spacing.sm},
    spotCard: {marginTop: spacing.lg, gap: spacing.md},
    track: {flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden'},
    fill: {height: 12},
    legendRow: {flexDirection: 'row', gap: spacing.lg},
    legendItem: {alignItems: 'flex-start'},
    legendLabelRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    legendDot: {width: 8, height: 8, borderRadius: 4},
    legendValue: {marginTop: spacing.xs},
    disclaimer: {marginTop: spacing.md},
});

export default MyLeaveBalanceScreen;
