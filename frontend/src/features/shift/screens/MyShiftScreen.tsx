import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
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
import {fetchMyShifts, shortTime, thisWeekRange, WorkShift} from '../services/shiftService';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-06-17" -> "6월 17일 (수)" */
function formatShiftDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(n => Number(n));
    if (!y || !m || !d) {
        return iso;
    }
    const weekday = WEEKDAY[new Date(y, m - 1, d).getDay()];
    return `${m}월 ${d}일 (${weekday})`;
}

/**
 * 내 근무 일정 (B10/E-NEW-05) — 직원 본인 이번 주 시프트 조회.
 * 사장이 등록한 일정을 일자·시간·메모로 확인. 조회 전용(등록은 사장).
 */
const MyShiftScreen: React.FC = () => {
    const navigation = useNavigation();
    const c = useThemeColors();

    const [items, setItems] = useState<WorkShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const {from, to} = thisWeekRange();
            setItems(await fetchMyShifts(from, to));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 근무 일정" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="근무 일정을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="calendar-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="이번 주 근무 일정이 없어요"
                    description="사장님이 근무 일정을 등록하면 여기에서 확인할 수 있어요."
                />
            ) : (
                <View style={styles.list}>
                    <AppText variant="caption" tone="secondary" style={styles.caption}>
                        이번 주 근무 일정이에요.
                    </AppText>
                    {items.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.row}>
                                <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                    <Ionicons name="time-outline" size={20} color={c.textSecondary} />
                                </View>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd">{formatShiftDate(it.shiftDate)}</AppText>
                                    <AppText variant="caption" tone="secondary">
                                        {shortTime(it.startTime)} ~ {shortTime(it.endTime)}
                                        {it.memo ? ` · ${it.memo}` : ''}
                                    </AppText>
                                </View>
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    caption: {marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1},
});

export default MyShiftScreen;
