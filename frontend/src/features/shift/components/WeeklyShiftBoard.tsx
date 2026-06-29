import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppText} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import {isOvernight, shortTime, WorkShift} from '../services/shiftService';

/**
 * 드래그앤드롭 주간 스케줄 보드 (B10).
 *
 * <p>요일별 고정 높이 행에 근무 칩을 배치하고, 칩을 길게 눌러 위/아래로 끌면 다른 요일로 이동한다.
 * 행 높이가 고정(ROW_HEIGHT)이라 translationY를 일(day) 단위로 결정적으로 환산 — 좌표 측정 불필요.
 * 이동(드롭) 시 onMoveShift로 새 날짜를 알리며, 실제 반영은 상위에서 updateShift 호출.
 *
 * <p>스코프: 기존 근무의 "요일 이동"만. 신규 생성·시각 변경은 폼/수정모드에서.
 */

const ROW_HEIGHT = 84;
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

interface Props {
    weekDates: string[]; // 길이 7, 월~일 ISO(YYYY-MM-DD)
    shifts: WorkShift[];
    employeeNameById: Record<number, string>;
    onMoveShift: (shift: WorkShift, newDate: string) => void;
    onPressShift?: (shift: WorkShift) => void;
    disabled?: boolean;
}

export default function WeeklyShiftBoard({
    weekDates,
    shifts,
    employeeNameById,
    onMoveShift,
    onPressShift,
    disabled,
}: Props) {
    const c = useThemeColors();

    // 드래그 중 강조할 대상 요일 인덱스(-1=없음). UI 스레드에서 행 강조에 사용.
    const targetIndex = useSharedValue(-1);
    const dragging = useSharedValue(0);

    const dateIndex = React.useMemo(() => {
        const map: Record<string, number> = {};
        weekDates.forEach((d, i) => {
            map[d] = i;
        });
        return map;
    }, [weekDates]);

    const shiftsByIndex = React.useMemo(() => {
        const rows: WorkShift[][] = weekDates.map(() => []);
        shifts.forEach(s => {
            const idx = dateIndex[s.shiftDate];
            if (idx !== undefined) {
                rows[idx].push(s);
            }
        });
        rows.forEach(list =>
            list.sort((a, b) => shortTime(a.startTime).localeCompare(shortTime(b.startTime))),
        );
        return rows;
    }, [shifts, weekDates, dateIndex]);

    return (
        <View style={styles.board}>
            {weekDates.map((date, index) => (
                <DayRow
                    key={date}
                    date={date}
                    index={index}
                    rowShifts={shiftsByIndex[index]}
                    weekDates={weekDates}
                    employeeNameById={employeeNameById}
                    targetIndex={targetIndex}
                    dragging={dragging}
                    onMoveShift={onMoveShift}
                    onPressShift={onPressShift}
                    disabled={disabled}
                    colors={c}
                />
            ))}
        </View>
    );
}

interface DayRowProps {
    date: string;
    index: number;
    rowShifts: WorkShift[];
    weekDates: string[];
    employeeNameById: Record<number, string>;
    targetIndex: SharedValue<number>;
    dragging: SharedValue<number>;
    onMoveShift: (shift: WorkShift, newDate: string) => void;
    onPressShift?: (shift: WorkShift) => void;
    disabled?: boolean;
    colors: ReturnType<typeof useThemeColors>;
}

function DayRow({
    date,
    index,
    rowShifts,
    weekDates,
    employeeNameById,
    targetIndex,
    dragging,
    onMoveShift,
    onPressShift,
    disabled,
    colors: c,
}: DayRowProps) {
    const [, month, day] = date.split('-');

    const rowStyle = useAnimatedStyle(() => {
        const isTarget = dragging.value === 1 && targetIndex.value === index;
        return {
            backgroundColor: isTarget ? c.brandPrimarySoft : 'transparent',
            borderColor: isTarget ? c.brandPrimary : c.border,
        };
    });

    return (
        <Animated.View style={[styles.row, rowStyle]}>
            <View style={styles.rowHeader}>
                <AppText variant="caption" tone="secondary">{WEEKDAY_LABELS[index]}</AppText>
                <AppText variant="titleMd">{Number(month)}/{Number(day)}</AppText>
            </View>
            <View style={styles.rowBody}>
                {rowShifts.length === 0 ? (
                    <AppText variant="caption" tone="tertiary">—</AppText>
                ) : (
                    rowShifts.map(shift => (
                        <DraggableChip
                            key={shift.id}
                            shift={shift}
                            dayIndex={index}
                            weekDates={weekDates}
                            name={employeeNameById[shift.employeeId] ?? '직원'}
                            targetIndex={targetIndex}
                            dragging={dragging}
                            onMoveShift={onMoveShift}
                            onPressShift={onPressShift}
                            disabled={disabled}
                            colors={c}
                        />
                    ))
                )}
            </View>
        </Animated.View>
    );
}

interface ChipProps {
    shift: WorkShift;
    dayIndex: number;
    weekDates: string[];
    name: string;
    targetIndex: SharedValue<number>;
    dragging: SharedValue<number>;
    onMoveShift: (shift: WorkShift, newDate: string) => void;
    onPressShift?: (shift: WorkShift) => void;
    disabled?: boolean;
    colors: ReturnType<typeof useThemeColors>;
}

function clampIndex(i: number): number {
    'worklet';
    if (i < 0) {
        return 0;
    }
    if (i > 6) {
        return 6;
    }
    return i;
}

function DraggableChip({
    shift,
    dayIndex,
    weekDates,
    name,
    targetIndex,
    dragging,
    onMoveShift,
    onPressShift,
    disabled,
    colors: c,
}: ChipProps) {
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const lifted = useSharedValue(0);

    const handleDrop = React.useCallback(
        (newIndex: number) => {
            if (newIndex !== dayIndex) {
                onMoveShift(shift, weekDates[newIndex]);
            }
        },
        [dayIndex, onMoveShift, shift, weekDates],
    );

    const handleTap = React.useCallback(() => {
        onPressShift?.(shift);
    }, [onPressShift, shift]);

    const pan = Gesture.Pan()
        .enabled(!disabled)
        .activateAfterLongPress(220)
        .onStart(() => {
            lifted.value = withTiming(1, {duration: 120});
            dragging.value = 1;
            targetIndex.value = dayIndex;
        })
        .onUpdate(e => {
            tx.value = e.translationX;
            ty.value = e.translationY;
            targetIndex.value = clampIndex(dayIndex + Math.round(e.translationY / ROW_HEIGHT));
        })
        .onEnd(() => {
            const dest = clampIndex(dayIndex + Math.round(ty.value / ROW_HEIGHT));
            runOnJS(handleDrop)(dest);
        })
        .onFinalize(() => {
            tx.value = withTiming(0, {duration: 140});
            ty.value = withTiming(0, {duration: 140});
            lifted.value = withTiming(0, {duration: 140});
            dragging.value = 0;
            targetIndex.value = -1;
        });

    const tap = Gesture.Tap()
        .enabled(!disabled && !!onPressShift)
        .maxDuration(220)
        .onEnd(() => {
            runOnJS(handleTap)();
        });

    const gesture = Gesture.Exclusive(pan, tap);

    const chipStyle = useAnimatedStyle(() => ({
        transform: [
            {translateX: tx.value},
            {translateY: ty.value},
            {scale: 1 + lifted.value * 0.06},
        ],
        zIndex: lifted.value > 0 ? 50 : 1,
        elevation: lifted.value > 0 ? 8 : 0,
        shadowOpacity: lifted.value * 0.25,
    }));

    const overnight = shift.crossesMidnight ?? isOvernight(shift.startTime, shift.endTime);

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                style={[
                    styles.chip,
                    {backgroundColor: c.surfaceSky, borderColor: c.border},
                    chipStyle,
                ]}>
                <Ionicons name="time-outline" size={13} color={c.info} />
                <View style={styles.chipText}>
                    <AppText variant="caption" numberOfLines={1}>{name}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {shortTime(shift.startTime)}~{shortTime(shift.endTime)}{overnight ? ' 익일' : ''}
                    </AppText>
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    board: {
        gap: spacing.xs,
    },
    row: {
        minHeight: ROW_HEIGHT,
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
    },
    rowHeader: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        maxWidth: 150,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        shadowColor: '#000',
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 3},
    },
    chipText: {
        flexShrink: 1,
    },
});
