/**
 * AppCalendar — 월 달력 (외부 라이브러리 미사용).
 * 날짜 탭 → onDayPress, 월 이동 → onMonthChange.
 * markedDates의 dots 배열(hex color)로 근무 점 표시 (최대 3개).
 */
import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppText} from './ds';
import {useThemeColors} from '../hooks/useThemeColors';
import {radius, spacing} from '../../theme/tokens';
import {COLORS} from './logo/Colors';

export interface CalendarDayMark {
    /** hex 색상 문자열 배열. 최대 3개 표시. */
    dots?: string[];
}

interface Props {
    /** 'YYYY-MM' controlled — 표시할 월 */
    month: string;
    onMonthChange: (month: string) => void;
    /** 'YYYY-MM-DD' → 마크 정보 */
    markedDates?: Record<string, CalendarDayMark>;
    /** 선택된 날짜 'YYYY-MM-DD' */
    selectedDate?: string | null;
    onDayPress?: (date: string) => void;
    style?: ViewStyle;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const CELL = 40;

function adjMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function isoStr(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIso(): string {
    const n = new Date();
    return isoStr(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export default function AppCalendar({
    month,
    onMonthChange,
    markedDates = {},
    selectedDate,
    onDayPress,
    style,
}: Props) {
    const c = useThemeColors();
    const today = todayIso();
    const [y, m] = month.split('-').map(Number);

    const startOffset = new Date(y, m - 1, 1).getDay(); // 0=일
    const lastDay = new Date(y, m, 0).getDate();

    const cells: (number | null)[] = [
        ...Array(startOffset).fill(null),
        ...Array.from({length: lastDay}, (_, i) => i + 1),
    ];
    while (cells.length % 7) {cells.push(null);}

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {rows.push(cells.slice(i, i + 7));}

    return (
        <View style={[styles.container, style]}>
            {/* 월 헤더 */}
            <View style={styles.header}>
                <Pressable hitSlop={12} onPress={() => onMonthChange(adjMonth(month, -1))}>
                    <Ionicons name="chevron-back-outline" size={24} color={c.textPrimary} />
                </Pressable>
                <AppText variant="headingSm" weight="700">
                    {y}년 {m}월
                </AppText>
                <Pressable hitSlop={12} onPress={() => onMonthChange(adjMonth(month, 1))}>
                    <Ionicons name="chevron-forward-outline" size={24} color={c.textPrimary} />
                </Pressable>
            </View>

            {/* 요일 레이블 */}
            <View style={styles.row}>
                {DAY_LABELS.map((label, i) => (
                    <View key={label} style={styles.cell}>
                        <AppText
                            variant="caption"
                            weight="700"
                            style={{color: i === 0 ? c.error : i === 6 ? c.info : c.textTertiary}}>
                            {label}
                        </AppText>
                    </View>
                ))}
            </View>

            {/* 날짜 행 */}
            {rows.map((row, ri) => (
                <View key={ri} style={styles.row}>
                    {row.map((day, ci) => {
                        if (!day) {return <View key={`e${ri}${ci}`} style={styles.cell} />;}
                        const dateStr = isoStr(y, m, day);
                        const isSel = selectedDate === dateStr;
                        const isTod = dateStr === today;
                        const mark = markedDates[dateStr];
                        const txtColor =
                            isSel || isTod
                                ? c.textInverse
                                : ci === 0
                                ? c.error
                                : ci === 6
                                ? c.info
                                : c.textPrimary;

                        return (
                            <Pressable
                                key={dateStr}
                                style={styles.cell}
                                onPress={() => onDayPress?.(dateStr)}>
                                <View
                                    style={[
                                        styles.circle,
                                        isSel && {backgroundColor: c.brandPrimary},
                                        !isSel && isTod && {backgroundColor: COLORS.SODAM_BLUE},
                                    ]}>
                                    <AppText
                                        variant="bodyMd"
                                        weight={isSel || isTod ? '700' : '400'}
                                        style={{color: txtColor}}>
                                        {day}
                                    </AppText>
                                </View>
                                <View style={styles.dots}>
                                    {(mark?.dots ?? []).slice(0, 3).map((color, di) => (
                                        <View
                                            key={di}
                                            style={[styles.dot, {backgroundColor: color}]}
                                        />
                                    ))}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {paddingHorizontal: spacing.xs},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    row: {flexDirection: 'row'},
    cell: {flex: 1, alignItems: 'center', paddingVertical: 3},
    circle: {
        width: CELL,
        height: CELL,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 3,
        height: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    dot: {width: 5, height: 5, borderRadius: 3},
});
