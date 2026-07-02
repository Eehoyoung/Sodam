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
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';

type Route = RouteProp<
    {B: {storeId: number; employeeId: number; employeeName?: string}},
    'B'
>;


// ?뷀븳 ?닿쾶 遺???⑥쐞(遺?. 짠54: 4h??30遺? 8h??60遺?
const MINUTE_OPTIONS = [30, 60, 90];

function todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}${m}${day}`;
}

/**
 * ?닿쾶 遺??利앸튃(L-NEW-04, 洹쇰줈湲곗?踰?짠54) ???ъ옣 ?꾩슜.
 *
 * 吏곸썝蹂꾨줈 "?닿쾶瑜??ㅼ젣濡?以щ떎"??湲곕줉???④릿?? ?꾧툑 怨듭젣媛 ?꾨땲??遺???섎Т??
 * 利앸튃???놁쑝硫??꾧툑泥대텋 吏꾩젙 ???ъ옣??遺덈━?섎떎. ?꾧툑怨꾩궛怨쇰뒗 ?낅┰??湲곕줉.
 */
const BreakRecordScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [items, setItems] = useState<BreakRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [workDate, setWorkDateValue] = useState(todayStr());
    const setWorkDate = (value: string) => setWorkDateValue(sanitizeDateDigits(value));
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
        if (!isValidDateDigits(workDate)) {
            setFormError(DATE_DIGITS_HELPER);
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await addBreak(storeId, employeeId, {
                workDate: dateDigitsToIso(workDate),
                breakMinutes: MINUTE_OPTIONS[minuteIdx],
                grantedConfirmed: granted,
                memo: memo.trim() || undefined,
            });
            setMemo('');
            AppToast.success('?닿쾶 遺??湲곕줉??異붽??덉뼱??');
            await load();
        } catch {
            setFormError('??μ뿉 ?ㅽ뙣?덉뼱?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (item: BreakRecord) =>
        ConfirmSheet.confirm({
            title: '?닿쾶 湲곕줉????젣?좉퉴??',
            description: `${item.workDate} 쨌 ${item.breakMinutes}遺?湲곕줉????젣?쇱슂. 利앸튃 ?먮즺媛 ?щ씪吏???좎쨷????젣??二쇱꽭??`,
            primary: {
                label: '??젣',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteBreak(storeId, employeeId, item.id);
                        AppToast.success('?닿쾶 湲곕줉????젣?덉뼱??');
                        await load();
                    } catch {
                        AppToast.error('??젣???ㅽ뙣?덉뼱?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
                    }
                },
            },
            secondary: {label: '痍⑥냼'},
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
            footer={<AppButton label="휴게 기록 추가" onPress={save} loading={saving} />}>
            <View style={[styles.notice, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                    휴게는 임금에서 빼는 것과 별개로 실제로 부여했다는 증빙이 필요해요.
                    이 기록은 휴게 부여 증빙이며 임금 계산에는 영향을 주지 않아요.
                </AppText>
            </View>

            <AppCard variant="flat" style={styles.formCard}>
                <AppText variant="caption" tone="secondary" style={styles.label}>근무일</AppText>
                <AppInput
                    value={workDate}
                    onChangeText={setWorkDate}
                    placeholder="20260629"
                    keyboardType="number-pad"
                    maxLength={8}
                    helper={DATE_DIGITS_HELPER}
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
                    placeholder="예: 점심 휴게"
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
                    title="?닿쾶 湲곕줉??遺덈윭?ㅼ? 紐삵뻽?댁슂"
                    description="?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"
                    primary={{label: '?ㅼ떆 ?쒕룄', onPress: load}}
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
