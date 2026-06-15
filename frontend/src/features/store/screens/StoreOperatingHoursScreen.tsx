import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import api from '../../../common/utils/api';

type DayOfWeek =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

const DAY_ORDER: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];

const DAY_KOREAN: Record<DayOfWeek, string> = {
    MONDAY: '월요일',
    TUESDAY: '화요일',
    WEDNESDAY: '수요일',
    THURSDAY: '목요일',
    FRIDAY: '금요일',
    SATURDAY: '토요일',
    SUNDAY: '일요일',
};

interface DayRow {
    dayOfWeek: DayOfWeek;
    openTime: string; // HH:mm (편집용)
    closeTime: string; // HH:mm
    isClosed: boolean;
}

interface ApiDay {
    dayOfWeek: DayOfWeek;
    openTime?: string | null; // HH:mm:ss
    closeTime?: string | null;
    isClosed?: boolean;
}

/** HH:mm:ss | HH:mm → HH:mm */
function toHHmm(v?: string | null): string {
    if (!v) {
        return '';
    }
    return v.slice(0, 5);
}

/** HH:mm → HH:mm:ss (저장용). 빈 값/형식 이상은 null 처리. */
function toHHmmss(v: string): string | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) {
        return null;
    }
    const hh = Math.min(23, parseInt(m[1], 10));
    const mm = Math.min(59, parseInt(m[2], 10));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}

function defaultRows(): DayRow[] {
    return DAY_ORDER.map(d => ({
        dayOfWeek: d,
        openTime: '09:00',
        closeTime: '18:00',
        isClosed: d === 'SUNDAY',
    }));
}

/**
 * 매장 운영시간 편집 (PRD_OWNER A-13 / S-501a).
 * GET /api/stores/{storeId}/operating-hours → 요일별 로드
 * PUT /api/stores/{storeId}/operating-hours → 7개 요일 모두 전송
 */
const StoreOperatingHoursScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const c = useThemeColors();
    const storeId = route.params?.storeId as number | undefined;

    const [rows, setRows] = useState<DayRow[]>(defaultRows());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get<{operatingHours?: ApiDay[]}>(
                    `/api/stores/${storeId}/operating-hours`,
                );
                const list = res.data?.operatingHours ?? [];
                if (list.length > 0) {
                    const byDay = new Map<DayOfWeek, ApiDay>();
                    list.forEach(d => byDay.set(d.dayOfWeek, d));
                    setRows(
                        DAY_ORDER.map(day => {
                            const d = byDay.get(day);
                            const closed = d?.isClosed ?? false;
                            return {
                                dayOfWeek: day,
                                openTime: toHHmm(d?.openTime) || '09:00',
                                closeTime: toHHmm(d?.closeTime) || '18:00',
                                isClosed: closed,
                            };
                        }),
                    );
                }
            } catch (_) {/* 미설정 매장 → 기본값 유지 */} finally {
                setLoading(false);
            }
        })();
    }, [storeId]);

    const updateRow = (day: DayOfWeek, patch: Partial<DayRow>) => {
        setRows(prev => prev.map(r => (r.dayOfWeek === day ? {...r, ...patch} : r)));
    };

    const save = async () => {
        if (!storeId) {
            AppToast.warn('매장 정보를 찾을 수 없어요.');
            return;
        }
        // 검증: 영업일은 시간 형식·순서 확인
        for (const r of rows) {
            if (r.isClosed) {
                continue;
            }
            const open = toHHmmss(r.openTime);
            const close = toHHmmss(r.closeTime);
            if (!open || !close) {
                AppToast.warn(`${DAY_KOREAN[r.dayOfWeek]} 시간을 HH:mm 형식으로 입력해 주세요.`);
                return;
            }
            if (open >= close) {
                AppToast.warn(`${DAY_KOREAN[r.dayOfWeek]} 마감 시간은 시작 시간보다 늦어야 해요.`);
                return;
            }
        }
        if (rows.every(r => r.isClosed)) {
            AppToast.warn('최소 하루는 영업해야 해요.');
            return;
        }

        const body = {
            operatingHours: rows.map(r => ({
                dayOfWeek: r.dayOfWeek,
                openTime: r.isClosed ? null : toHHmmss(r.openTime),
                closeTime: r.isClosed ? null : toHHmmss(r.closeTime),
                isClosed: r.isClosed,
            })),
        };

        setSaving(true);
        try {
            await api.put(`/api/stores/${storeId}/operating-hours`, body);
            AppToast.success('운영시간이 저장됐어요.');
            navigation.goBack();
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ScreenContainer header={<AppHeader title="운영시간 설정" onBack={() => navigation.goBack()} />}>
                <LoadingState title="운영시간 불러오는 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="운영시간 설정" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="운영시간 저장" loading={saving} onPress={save} />
                </CtaStack>
            }>
            <AppText variant="headingSm" style={styles.title}>요일별 영업 시간을{'\n'}설정해 주세요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.intro}>
                출퇴근 인증과 이상 알림에 사용돼요.
            </AppText>

            <View style={styles.list}>
                {rows.map(r => (
                    <AppCard key={r.dayOfWeek} variant="plain" style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                            <AppText variant="titleMd">{DAY_KOREAN[r.dayOfWeek]}</AppText>
                            <Pressable
                                onPress={() => updateRow(r.dayOfWeek, {isClosed: !r.isClosed})}
                                style={[
                                    styles.closedToggle,
                                    {backgroundColor: r.isClosed ? c.surfaceMuted : c.brandPrimarySoft},
                                ]}>
                                <Ionicons
                                    name={r.isClosed ? 'moon-outline' : 'storefront-outline'}
                                    size={14}
                                    color={r.isClosed ? c.textSecondary : c.brandPrimary}
                                />
                                <AppText
                                    variant="caption"
                                    weight="700"
                                    tone={r.isClosed ? 'secondary' : 'brand'}>
                                    {r.isClosed ? '휴무' : '영업'}
                                </AppText>
                            </Pressable>
                        </View>

                        {r.isClosed ? (
                            <AppText variant="caption" tone="tertiary" style={styles.closedHint}>
                                이 요일은 휴무로 설정됐어요.
                            </AppText>
                        ) : (
                            <View style={styles.timeRow}>
                                <AppInput
                                    label="오픈"
                                    value={r.openTime}
                                    onChangeText={v => updateRow(r.dayOfWeek, {openTime: v})}
                                    placeholder="09:00"
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                    containerStyle={styles.timeInput}
                                />
                                <AppInput
                                    label="마감"
                                    value={r.closeTime}
                                    onChangeText={v => updateRow(r.dayOfWeek, {closeTime: v})}
                                    placeholder="18:00"
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                    containerStyle={styles.timeInput}
                                />
                            </View>
                        )}
                    </AppCard>
                ))}
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    title: {marginBottom: spacing.xs},
    intro: {marginBottom: spacing.xl, lineHeight: 22},
    list: {gap: spacing.md},
    dayCard: {gap: spacing.md},
    dayHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    closedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 70,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radius.pill,
        justifyContent: 'center',
    },
    closedHint: {marginTop: 2},
    timeRow: {flexDirection: 'row', gap: spacing.md},
    timeInput: {flex: 1},
});

export default StoreOperatingHoursScreen;
