import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    ConfirmSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {addBreak, BreakRecord, deleteBreak, fetchBreaks} from '../services/breakService';

type Route = RouteProp<
    {B: {storeId: number; employeeId: number; employeeName?: string}},
    'B'
>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 흔한 휴게 부여 단위(분). §54: 4h↑ 30분, 8h↑ 60분.
const MINUTE_OPTIONS = [30, 60, 90];

function todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 휴게 부여 증빙(L-NEW-04, 근로기준법 §54) — 사장 전용.
 *
 * 직원별로 "휴게를 실제로 줬다"는 기록을 남긴다. 임금 공제가 아니라 부여 의무라,
 * 증빙이 없으면 임금체불 진정 시 사장이 불리하다. 임금계산과는 독립된 기록.
 */
const BreakRecordScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [items, setItems] = useState<BreakRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [workDate, setWorkDate] = useState(todayStr());
    const [minuteIdx, setMinuteIdx] = useState(0);
    const [granted, setGranted] = useState(true);
    const [memo, setMemo] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await fetchBreaks(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const save = async () => {
        if (saving) {
            return;
        }
        if (!DATE_RE.test(workDate)) {
            setFormError('근무일은 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await addBreak(storeId, employeeId, {
                workDate,
                breakMinutes: MINUTE_OPTIONS[minuteIdx],
                grantedConfirmed: granted,
                memo: memo.trim() || undefined,
            });
            setMemo('');
            AppToast.success('휴게 부여 기록을 추가했어요.');
            await load();
        } catch {
            setFormError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (item: BreakRecord) =>
        ConfirmSheet.confirm({
            title: '휴게 기록을 삭제할까요?',
            description: `${item.workDate} · ${item.breakMinutes}분 기록이 삭제돼요. 증빙 자료가 사라지니 신중히 삭제해 주세요.`,
            primary: {
                label: '삭제',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteBreak(storeId, employeeId, item.id);
                        AppToast.success('휴게 기록을 삭제했어요.');
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
                    title={employeeName ? `${employeeName} · 휴게 기록` : '휴게 기록'}
                    onBack={() => navigation.goBack()}
                />
            }
            footer={<AppButton label="휴게 부여 기록 추가" onPress={save} loading={saving} />}>
            <View style={[styles.notice, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                    휴게는 임금에서 빼는 것과 별개로 실제로 부여해야 하는 의무예요(근로기준법 §54).
                    이 기록은 휴게 부여 증빙용이며 임금 계산에는 영향을 주지 않아요.
                </AppText>
            </View>

            <AppCard variant="flat" style={styles.formCard}>
                <AppText variant="caption" tone="secondary" style={styles.label}>근무일</AppText>
                <AppInput
                    value={workDate}
                    onChangeText={setWorkDate}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>휴게시간(분)</AppText>
                <SegmentedControl
                    options={MINUTE_OPTIONS.map(m => `${m}분`)}
                    value={minuteIdx}
                    onChange={setMinuteIdx}
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>부여 확인</AppText>
                <SegmentedControl
                    options={['실제 부여함', '미확인']}
                    value={granted ? 0 : 1}
                    onChange={i => setGranted(i === 0)}
                />

                <AppText variant="caption" tone="secondary" style={styles.label}>메모 (선택)</AppText>
                <AppInput
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="예: 점심 휴게 12:00~13:00"
                    maxLength={300}
                />

                {formError ? (
                    <AppText variant="caption" tone="error" style={styles.error}>{formError}</AppText>
                ) : null}
            </AppCard>

            <AppText variant="titleMd" style={styles.listTitle}>부여 기록</AppText>

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="휴게 기록을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="cafe-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="등록된 휴게 기록이 없어요"
                    description="휴게를 부여한 날과 시간을 기록하면 증빙 자료로 보관돼요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.row}>
                                <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                    <Ionicons name="cafe-outline" size={20} color={c.textSecondary} />
                                </View>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd" numberOfLines={1}>
                                        {it.workDate} · {it.breakMinutes}분
                                    </AppText>
                                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                        {it.memo ? it.memo : '메모 없음'}
                                    </AppText>
                                </View>
                                <AppBadge
                                    label={it.grantedConfirmed ? '부여 확인' : '미확인'}
                                    tone={it.grantedConfirmed ? 'success' : 'warning'}
                                />
                                <Pressable
                                    onPress={() => confirmDelete(it)}
                                    hitSlop={8}
                                    style={({pressed}) => [styles.delete, pressed && styles.pressed]}>
                                    <Ionicons name="trash-outline" size={18} color={c.textTertiary} />
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
    notice: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: 14},
    noticeText: {flex: 1, lineHeight: 18},
    formCard: {marginTop: spacing.lg},
    label: {marginTop: spacing.md, marginBottom: spacing.xs},
    error: {marginTop: spacing.sm},
    listTitle: {marginTop: spacing.xxl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1},
    delete: {padding: spacing.xs},
    pressed: {opacity: 0.6},
});

export default BreakRecordScreen;
