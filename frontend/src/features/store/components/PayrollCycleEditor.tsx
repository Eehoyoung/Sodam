import React from 'react';
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';

export type MonthOffset = 'PREV_MONTH' | 'CURRENT_MONTH' | 'NEXT_MONTH';

/** 급여 정산 주기 폼 상태. day 는 사용자가 입력하는 원시 문자열(저장 시 0 패딩·정수 변환). */
export interface PayrollCycleForm {
    startOffset: MonthOffset; // PREV_MONTH | CURRENT_MONTH
    startDay: string;
    endOffset: MonthOffset; // CURRENT_MONTH | NEXT_MONTH
    endDay: string;
    endLastDay: boolean;
    payOffset: MonthOffset; // CURRENT_MONTH | NEXT_MONTH
    payDay: string;
    payDayLastDay: boolean;
}

export const defaultPayrollCycle = (): PayrollCycleForm => ({
    startOffset: 'PREV_MONTH',
    startDay: '01',
    endOffset: 'CURRENT_MONTH',
    endDay: '',
    endLastDay: true, // 가장 흔한 형태: 당월 말일 마감
    payOffset: 'NEXT_MONTH',
    payDay: '10',
    payDayLastDay: false,
});

/** 1자리 입력을 2자리("0X")로 패딩. 빈 값/말일은 그대로. */
export const padDay = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    if (!digits) {return '';}
    const n = Math.max(1, Math.min(31, parseInt(digits, 10)));
    return String(n).padStart(2, '0');
};

/** 폼 → BE PayrollCycleDto. 미완성(필수 일 누락)이면 null 반환(전송 안 함). */
export const toPayrollCyclePayload = (f: PayrollCycleForm) => {
    const startDay = parseInt(f.startDay, 10);
    if (!Number.isFinite(startDay)) {return null;}
    if (!f.endLastDay && !Number.isFinite(parseInt(f.endDay, 10))) {return null;}
    if (!f.payDayLastDay && !Number.isFinite(parseInt(f.payDay, 10))) {return null;}
    return {
        startOffset: f.startOffset,
        startDay,
        endOffset: f.endOffset,
        endDay: f.endLastDay ? null : parseInt(f.endDay, 10),
        endLastDay: f.endLastDay,
        payOffset: f.payOffset,
        payDay: f.payDayLastDay ? null : parseInt(f.payDay, 10),
        payDayLastDay: f.payDayLastDay,
    };
};

/** BE store 응답의 payrollCycle → 폼 상태(없으면 null). */
export const fromStorePayrollCycle = (pc: any): PayrollCycleForm | null => {
    if (!pc?.startOffset) {return null;}
    return {
        startOffset: pc.startOffset,
        startDay: pc.startDay ?? '',
        endOffset: pc.endOffset ?? 'CURRENT_MONTH',
        endDay: pc.endDay ?? '',
        endLastDay: !!pc.endLastDay,
        payOffset: pc.payOffset ?? 'NEXT_MONTH',
        payDay: pc.payDay ?? '',
        payDayLastDay: !!pc.payDayLastDay,
    };
};

interface Props {
    value: PayrollCycleForm;
    onChange: (next: PayrollCycleForm) => void;
}

const OFFSET_LABEL: Record<MonthOffset, string> = {
    PREV_MONTH: '전월',
    CURRENT_MONTH: '당월',
    NEXT_MONTH: '익월',
};

const PayrollCycleEditor: React.FC<Props> = ({value, onChange}) => {
    const c = useThemeColors();
    const set = (patch: Partial<PayrollCycleForm>) => onChange({...value, ...patch});

    const OffsetToggle = ({options, active, onPick}: {options: MonthOffset[]; active: MonthOffset; onPick: (o: MonthOffset) => void}) => (
        <View style={[styles.toggle, {borderColor: c.border}]}>
            {options.map(opt => {
                const on = opt === active;
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.toggleItem, on && {backgroundColor: c.brandPrimary}]}
                        onPress={() => onPick(opt)}>
                        <AppText variant="caption" weight="700" style={{color: on ? c.textInverse : c.textSecondary}}>
                            {OFFSET_LABEL[opt]}
                        </AppText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const DayField = ({day, onDay, disabled}: {day: string; onDay: (s: string) => void; disabled?: boolean}) => (
        <View style={[styles.dayBox, {borderColor: c.border, backgroundColor: disabled ? c.surfaceMuted : c.surface}]}>
            <TextInput
                style={[styles.dayInput, {color: disabled ? c.textTertiary : c.textPrimary}]}
                value={disabled ? '' : day}
                editable={!disabled}
                onChangeText={t => onDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                onBlur={() => !disabled && onDay(padDay(day))}
                keyboardType="number-pad"
                placeholder={disabled ? '말일' : 'DD'}
                placeholderTextColor={c.textTertiary}
                maxLength={2}
            />
            <AppText variant="caption" tone="tertiary">일</AppText>
        </View>
    );

    const LastDayChip = ({on, onToggle}: {on: boolean; onToggle: () => void}) => (
        <TouchableOpacity
            style={[styles.chip, {borderColor: on ? c.brandPrimary : c.border, backgroundColor: on ? c.brandPrimarySoft : 'transparent'}]}
            onPress={onToggle}>
            <AppText variant="caption" weight="700" style={{color: on ? c.brandPrimary : c.textSecondary}}>
                말일{on ? ' ✓' : ''}
            </AppText>
        </TouchableOpacity>
    );

    return (
        <View style={styles.wrap}>
            {/* 시작일 — 전월/당월 + 일 */}
            <View style={styles.row}>
                <AppText variant="bodyMd" weight="600" style={styles.rowLabel}>시작일</AppText>
                <OffsetToggle options={['PREV_MONTH', 'CURRENT_MONTH']} active={value.startOffset} onPick={o => set({startOffset: o})} />
                <DayField day={value.startDay} onDay={s => set({startDay: s})} />
            </View>

            {/* 마감일 — 당월/익월 + 일(또는 말일) */}
            <View style={styles.row}>
                <AppText variant="bodyMd" weight="600" style={styles.rowLabel}>마감일</AppText>
                <OffsetToggle options={['CURRENT_MONTH', 'NEXT_MONTH']} active={value.endOffset} onPick={o => set({endOffset: o})} />
                <DayField day={value.endDay} onDay={s => set({endDay: s})} disabled={value.endLastDay} />
                <LastDayChip on={value.endLastDay} onToggle={() => set({endLastDay: !value.endLastDay})} />
            </View>

            {/* 지급일 — 당월/익월 + 일(또는 말일) */}
            <View style={styles.row}>
                <AppText variant="bodyMd" weight="600" style={styles.rowLabel}>지급일</AppText>
                <OffsetToggle options={['CURRENT_MONTH', 'NEXT_MONTH']} active={value.payOffset} onPick={o => set({payOffset: o})} />
                <DayField day={value.payDay} onDay={s => set({payDay: s})} disabled={value.payDayLastDay} />
                <LastDayChip on={value.payDayLastDay} onToggle={() => set({payDayLastDay: !value.payDayLastDay})} />
            </View>

            <AppText variant="caption" tone="tertiary" style={styles.hint}>
                예) 전월 1일~당월 말일 일한 급여를 익월 10일에 지급. 한 자리 입력 시 자동으로 0을 붙여요(9→09).
            </AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap'},
    rowLabel: {width: 52},
    toggle: {flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden'},
    toggleItem: {paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 52, alignItems: 'center'},
    dayBox: {flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 6, minWidth: 64},
    dayInput: {minWidth: 28, fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 0},
    chip: {paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderRadius: 10},
    hint: {marginTop: spacing.xs, lineHeight: 18},
});

export default PayrollCycleEditor;
