/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {tokens} from '../../../theme/tokens';
import {AppBadge, AppHeader, AppListItem, AppText, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import notificationService, {NotificationPreferences} from '../../notification/services/notificationService';

const STORAGE_KEY = 'notificationPrefs.v1';

const DEFAULT_PREFS: NotificationPreferences = {
    master: true,
    attendance: true,
    payroll: true,
    billing: true,
    marketing: false,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
};

const useStyles = () => {
    const c = useThemeColors();
    return useMemo(() => makeStyles(c), [c]);
};

/**
 * 40 NotificationSettings — v3 아티팩트(sodam-v3-06-settings.html) 반영.
 * Switch 대신 배지형 리스트(AppListItem + AppBadge "켜짐"/"꺼짐") — 행 전체를 탭하면 토글된다.
 * on/off 저장 로직(update/AsyncStorage)은 그대로 유지, 시각 표현만 배지로 교체.
 * AsyncStorage 에 즉시 저장하고 `PUT /api/notifications/prefs` 로 서버에 동기화한다.
 *
 * <p>서버가 최종 기준이다 — 외부 푸시(FCM) 발송 여부는 BE 가 `NotificationPreference` 로
 * 판정한다. 인앱 알림함은 이 설정과 무관하게 항상 적재된다.</p>
 */
const NotificationSettingsScreen: React.FC = () => {
    const styles = useStyles();
    const c = useThemeColors();
    const navigation = useNavigation();
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
    const [pickerOpenFor, setPickerOpenFor] = useState<null | 'start' | 'end'>(null);
    const hasLocalChanges = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                const raw = await unifiedStorage.getItem(STORAGE_KEY);
                if (raw) {setPrefs({...DEFAULT_PREFS, ...JSON.parse(raw)});}
            } catch (_) {/* ignore */}
            try {
                const serverPrefs = await notificationService.getPreferences();
                const syncedPrefs = {...DEFAULT_PREFS, ...serverPrefs};
                if (!hasLocalChanges.current) {
                    setPrefs(syncedPrefs);
                    await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(syncedPrefs));
                }
            } catch (_) {/* retain local cache as fallback */}
        })();
    }, []);

    const update = async (next: NotificationPreferences) => {
        hasLocalChanges.current = true;
        setPrefs(next);
        try {
            await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (_) {/* ignore */}
        try {
            const serverPrefs = await notificationService.updatePreferences(next);
            const syncedPrefs = {...DEFAULT_PREFS, ...serverPrefs};
            setPrefs(syncedPrefs);
            await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(syncedPrefs));
        } catch (_) {/* local cache remains the offline fallback */}
    };

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const buildPickerDate = (hhmm: string): Date => {
        const [h, m] = hhmm.split(':').map(s => parseInt(s, 10) || 0);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };
    const onPickerChange = (which: 'start' | 'end') => (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {setPickerOpenFor(null);}
        if (event.type === 'dismissed' || !date) {return;}
        const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
        const key = which === 'start' ? 'quietStart' : 'quietEnd';
        update({...prefs, [key]: time});
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="알림 설정" onBack={() => navigation.goBack()} />}>
            <AppText variant="headingSm" style={styles.title}>받고 싶은 알림만{'\n'}켜두세요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.subtitle}>
                방해받기 싫은 시간대도 정할 수 있어요.
            </AppText>

            <View>
                <Section title="푸시 알림">
                    <Row
                        label="알림 받기"
                        bold
                        value={prefs.master}
                        onChange={v => update({...prefs, master: v})}
                    />
                </Section>

                <Section title="종류별" disabled={!prefs.master}>
                    <Row
                        label="출근·퇴근 알림"
                        sub="직원의 출퇴근 등록 또는 누락 안내"
                        value={prefs.attendance}
                        onChange={v => update({...prefs, attendance: v})}
                        disabled={!prefs.master}
                    />
                    <Row
                        label="급여 지급 알림"
                        sub="급여 명세서 발급·지급 완료"
                        value={prefs.payroll}
                        onChange={v => update({...prefs, payroll: v})}
                        disabled={!prefs.master}
                    />
                    <Row
                        label="결제 알림"
                        sub="구독 결제 성공·실패, 카드 만료"
                        value={prefs.billing}
                        onChange={v => update({...prefs, billing: v})}
                        disabled={!prefs.master}
                    />
                    <Row
                        label="프로모션·마케팅"
                        sub="신규 기능, 이벤트, 노무·세무 콘텐츠"
                        value={prefs.marketing}
                        onChange={v => update({...prefs, marketing: v})}
                        disabled={!prefs.master}
                    />
                </Section>

                <Section title="방해 금지 시간대" disabled={!prefs.master}>
                    <Row
                        label="방해 금지 사용"
                        sub="이 시간에는 알림 소리·진동이 꺼져요"
                        value={prefs.quietHoursEnabled}
                        onChange={v => update({...prefs, quietHoursEnabled: v})}
                        disabled={!prefs.master}
                    />
                    {prefs.quietHoursEnabled && prefs.master && (
                        <View style={styles.quietRow}>
                            <QuietTimePicker
                                label="시작"
                                value={prefs.quietStart}
                                onPress={() => setPickerOpenFor('start')}
                            />
                            <Text style={styles.quietTilde}>~</Text>
                            <QuietTimePicker
                                label="종료"
                                value={prefs.quietEnd}
                                onPress={() => setPickerOpenFor('end')}
                            />
                        </View>
                    )}
                    {pickerOpenFor && (
                        <DateTimePicker
                            value={buildPickerDate(pickerOpenFor === 'start' ? prefs.quietStart : prefs.quietEnd)}
                            mode="time"
                            is24Hour
                            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                            onChange={onPickerChange(pickerOpenFor)}
                        />
                    )}
                    <View style={styles.noteRow}>
                        <Ionicons name="information-circle-outline" size={16} color={c.textTertiary} />
                        <Text style={styles.note}>
                            결제 실패·보안 알림 같은 긴급 알림은 방해 금지에도 발송돼요.
                        </Text>
                    </View>
                </Section>

                <Section title="이메일 알림 (Phase 2)">
                    <Text style={styles.disabledText}>출시 후 도입 예정이에요.</Text>
                </Section>
            </View>
        </ScreenContainer>
    );
};

interface RowProps {
    label: string;
    sub?: string;
    /** 헤딩 성격 행(예: "알림 받기" 마스터 스위치) 여부 — AppListItem 은 title 이 항상 굵어 시각적으로 이미 반영됨 */
    bold?: boolean;
    value: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}

// v3 아티팩트 40: Switch 대신 배지(켜짐=teal/success, 꺼짐=neutral) — 행 전체 탭으로 토글.
const Row: React.FC<RowProps> = ({label, sub, value, disabled, onChange}) => {
    return (
        <AppListItem
            title={label}
            subtitle={sub}
            onPress={disabled ? undefined : () => onChange(!value)}
            style={disabled ? {opacity: 0.5} : undefined}
            right={<AppBadge label={value ? '켜짐' : '꺼짐'} tone={value ? 'success' : 'neutral'} />}
        />
    );
};

const Section: React.FC<{
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({title, children, disabled}) => {
    const styles = useStyles();
    return (
        <View style={[styles.section, disabled && {opacity: 0.5}]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.list}>{children}</View>
        </View>
    );
};

const QuietTimePicker: React.FC<{
    label: string;
    value: string;
    onPress: () => void;
}> = ({label, value, onPress}) => {
    const styles = useStyles();
    return (
        <View style={styles.timePicker}>
            <Text style={styles.timePickerLabel}>{label}</Text>
            <Pressable onPress={onPress} style={styles.timePickerValue}>
                <Text style={styles.timePickerValueText}>{value}</Text>
            </Pressable>
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    title: {marginBottom: tokens.spacing.xs},
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: c.textSecondary,
        lineHeight: 22,
        marginBottom: tokens.spacing.sm,
    },
    section: {marginTop: tokens.spacing.xxl},
    sectionTitle: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
        fontWeight: tokens.typography.weights.bold,
        marginBottom: tokens.spacing.sm,
        marginLeft: 2,
    },
    // v3 아티팩트 40: AppListItem 행을 간격만 두고 쌓는다(카드 안 카드 금지 — AppCard 래핑 제거).
    list: {gap: tokens.spacing.sm},
    quietRow: {flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const, paddingVertical: tokens.spacing.md},
    quietTilde: {color: c.textTertiary},
    timePicker: {alignItems: 'center' as const},
    timePickerLabel: {fontSize: tokens.typography.sizes.xs, color: c.textTertiary, marginBottom: 4},
    timePickerValue: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        borderWidth: 1,
        borderColor: c.brandPrimary,
        borderRadius: tokens.radius.md,
        backgroundColor: c.surface,
    },
    timePickerValueText: {
        fontSize: tokens.typography.sizes.lg,
        color: c.brandPrimary,
        fontWeight: tokens.typography.weights.semibold,
        fontVariant: ['tabular-nums' as const],
    },
    noteRow: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        gap: tokens.spacing.xs,
        marginTop: tokens.spacing.md,
    },
    note: {
        flex: 1,
        fontSize: tokens.typography.sizes.xs,
        color: c.textTertiary,
        lineHeight: 18,
    },
    disabledText: {color: c.textTertiary, fontSize: tokens.typography.sizes.sm, paddingVertical: tokens.spacing.md},
});

export default NotificationSettingsScreen;
