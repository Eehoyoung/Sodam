/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useEffect, useMemo, useState} from 'react';
import {Platform, Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {tokens} from '../../../theme/tokens';
import {AppCard, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

const STORAGE_KEY = 'notificationPrefs.v1';

interface NotificationPrefs {
    master: boolean;
    attendance: boolean;
    payroll: boolean;
    billing: boolean;
    marketing: boolean;
    quietHoursEnabled: boolean;
    quietStart: string; // HH:MM
    quietEnd: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
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
 * 알림 설정 (Settings · Notification).
 * AsyncStorage 에 즉시 저장. BE 동기화는 P1.
 *
 * TODO[P1 BE]: PUT /api/notifications/prefs — 서버 동기화 + 디바이스 간 일관성.
 */
const NotificationSettingsScreen: React.FC = () => {
    const styles = useStyles();
    const c = useThemeColors();
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [pickerOpenFor, setPickerOpenFor] = useState<null | 'start' | 'end'>(null);

    useEffect(() => {
        (async () => {
            try {
                const raw = await unifiedStorage.getItem(STORAGE_KEY);
                if (raw) {setPrefs({...DEFAULT_PREFS, ...JSON.parse(raw)});}
            } catch (_) {/* ignore */}
        })();
    }, []);

    const update = async (next: NotificationPrefs) => {
        setPrefs(next);
        try {
            await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (_) {/* ignore */}
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
        <ScreenContainer scroll header={<AppHeader title="알림 설정" />}>
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
    bold?: boolean;
    value: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}

const Row: React.FC<RowProps> = ({label, sub, bold, value, disabled, onChange}) => {
    const styles = useStyles();
    const c = useThemeColors();
    return (
        <View style={[styles.row, disabled && styles.rowDisabled]}>
            <View style={{flex: 1}}>
                <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
                {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                trackColor={{false: c.border, true: c.brandPrimary}}
                thumbColor={c.background}
            />
        </View>
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
            <AppCard variant="plain">{children}</AppCard>
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
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: tokens.spacing.sm + 2,
    },
    rowDisabled: {opacity: 0.5},
    rowLabel: {fontSize: tokens.typography.sizes.md, color: c.textPrimary},
    rowLabelBold: {fontWeight: tokens.typography.weights.bold},
    rowSub: {fontSize: tokens.typography.sizes.xs, color: c.textTertiary, marginTop: 2},
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
