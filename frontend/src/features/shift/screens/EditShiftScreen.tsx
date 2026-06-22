import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, useFocusEffect, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    ConfirmSheet,
    EmptyState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {
    createShift,
    deleteShift,
    fetchStoreShifts,
    shortTime,
    thisWeekRange,
    WorkShift,
} from '../services/shiftService';

type Route = RouteProp<{E: {storeId: number; employeeId: number; employeeName?: string}}, 'E'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 근무 시프트 등록 (B10/E-NEW-05) — 사장이 특정 직원의 근무 일정 추가·조회·삭제.
 * 날짜(YYYY-MM-DD)·시작/종료(HH:MM)·메모 입력 후 등록. 외부 picker 없이 텍스트 입력.
 * 스코프: 등록·조회만 — 자동배정·채용 없음(Non-Goal).
 */
const EditShiftScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [shiftDate, setShiftDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [memo, setMemo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [items, setItems] = useState<WorkShift[]>([]);

    const load = useCallback(async () => {
        try {
            const {from, to} = thisWeekRange();
            const all = await fetchStoreShifts(storeId, from, to);
            setItems(all.filter(s => s.employeeId === employeeId));
        } catch {
            AppToast.error('근무 일정을 불러오지 못했어요.');
        }
    }, [storeId, employeeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const save = async () => {
        if (!DATE_RE.test(shiftDate)) {
            setError('근무 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        if (!TIME_RE.test(startTime)) {
            setError('시작 시간을 HH:MM 형식으로 입력해 주세요.');
            return;
        }
        if (!TIME_RE.test(endTime)) {
            setError('종료 시간을 HH:MM 형식으로 입력해 주세요.');
            return;
        }
        if (endTime <= startTime) {
            setError('종료 시간은 시작 시간보다 늦어야 해요.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createShift(storeId, {
                employeeId,
                shiftDate,
                startTime,
                endTime,
                memo: memo.trim() || undefined,
            });
            setShiftDate('');
            setStartTime('');
            setEndTime('');
            setMemo('');
            AppToast.success('근무 일정을 등록했어요.');
            await load();
        } catch {
            setError('등록에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (shift: WorkShift) =>
        ConfirmSheet.confirm({
            title: '근무 일정을 삭제할까요?',
            description: `${shift.shiftDate} ${shortTime(shift.startTime)}~${shortTime(shift.endTime)} 일정을 삭제해요.`,
            primary: {
                label: '삭제',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteShift(storeId, shift.id);
                        AppToast.success('근무 일정을 삭제했어요.');
                        await load();
                    } catch {
                        AppToast.error('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
                    }
                },
            },
            secondary: {label: '취소'},
        });

    return (
        <ScreenContainer
            scroll
            header={
                <AppHeader
                    title={employeeName ? `${employeeName} · 근무 시프트` : '근무 시프트'}
                    onBack={() => navigation.goBack()}
                />
            }
            footer={<AppButton label="근무 일정 등록" onPress={save} loading={saving} />}>
            <AppText variant="caption" tone="secondary" style={styles.label}>근무 날짜</AppText>
            <AppInput
                value={shiftDate}
                onChangeText={setShiftDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
            />

            <View style={styles.timeRow}>
                <View style={styles.flex}>
                    <AppText variant="caption" tone="secondary" style={styles.label}>시작</AppText>
                    <AppInput
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="HH:MM"
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <View style={styles.flex}>
                    <AppText variant="caption" tone="secondary" style={styles.label}>종료</AppText>
                    <AppInput
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="HH:MM"
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
            </View>

            <AppText variant="caption" tone="secondary" style={styles.label}>메모 (선택)</AppText>
            <AppInput value={memo} onChangeText={setMemo} placeholder="예: 오픈 / 마감 / 홀" />

            {error ? (
                <AppText variant="caption" tone="error" style={styles.error}>{error}</AppText>
            ) : null}

            <AppText variant="titleMd" style={styles.listTitle}>이번 주 등록된 일정</AppText>
            {items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="calendar-outline" size={36} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="이번 주 등록된 일정이 없어요"
                    description="위에서 근무 날짜와 시간을 입력해 등록해 주세요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd">{it.shiftDate}</AppText>
                                    <AppText variant="caption" tone="secondary">
                                        {shortTime(it.startTime)} ~ {shortTime(it.endTime)}
                                        {it.memo ? ` · ${it.memo}` : ''}
                                    </AppText>
                                </View>
                                <Pressable
                                    onPress={() => confirmDelete(it)}
                                    hitSlop={8}
                                    style={({pressed}) => pressed && styles.pressed}>
                                    <Ionicons name="trash-outline" size={20} color={c.textTertiary} />
                                </Pressable>
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    label: {marginTop: spacing.md, marginBottom: spacing.xs},
    timeRow: {flexDirection: 'row', gap: spacing.md},
    flex: {flex: 1},
    error: {marginTop: spacing.sm},
    listTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    pressed: {opacity: 0.6},
});

export default EditShiftScreen;
