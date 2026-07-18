import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute, RouteProp, useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import storeService from '../../store/services/storeService';
import {
    fetchTaxReportHistory,
    sendTaxReport,
    updateAccountantEmail,
    TaxReportSendLog,
} from '../services/taxReportService';

type Route = RouteProp<{T: {storeId: number}}, 'T'>;

const won = (n: number) => `${n.toLocaleString()}원`;

/** month 오프셋(0=이번 달, -1=지난달)의 1일~말일 ISO 문자열. 서버 기준(Asia/Seoul) 날짜 문자열만 다룸. */
const monthRange = (offset: number): {from: string; to: string; label: string} => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
        from: iso(first),
        to: iso(last),
        label: `${first.getFullYear()}년 ${first.getMonth() + 1}월`,
    };
};

const fmtDateTime = (isoStr: string): string => {
    const d = new Date(isoStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes(),
    ).padStart(2, '0')}`;
};

/**
 * 세무사 송부 — 정산기간 인건비 내역서(PDF 직원별 집계 + CSV 건별 상세)를
 * 매장에 등록된 세무사 이메일로 발송. 확정·지급완료 급여만 포함.
 */
const TaxReportScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [email, setEmail] = useState('');
    const [savedEmail, setSavedEmail] = useState<string | null>(null);
    const [savingEmail, setSavingEmail] = useState(false);
    const [monthOffset, setMonthOffset] = useState(-1); // 기본: 지난달(신고 대상월)
    const [history, setHistory] = useState<TaxReportSendLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [store, logs] = await Promise.all([
                storeService.getStoreById(storeId),
                fetchTaxReportHistory(storeId),
            ]);
            setSavedEmail(store.taxAccountantEmail ?? null);
            setEmail(store.taxAccountantEmail ?? '');
            setHistory(logs);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    // 쓰기(발송/이메일 저장) 후 재진입 시 갱신 — 프로젝트 useFocusEffect refetch 패턴
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const saveEmail = async () => {
        setSavingEmail(true);
        try {
            await updateAccountantEmail(storeId, email.trim());
            setSavedEmail(email.trim() || null);
            Alert.alert('저장 완료', email.trim() ? '세무사 이메일이 저장되었어요.' : '세무사 이메일이 해제되었어요.');
        } catch (e: any) {
            Alert.alert('저장 실패', e?.response?.data?.message ?? '이메일 형식을 확인해 주세요.');
        } finally {
            setSavingEmail(false);
        }
    };

    const doSend = async (force: boolean) => {
        const {from, to, label} = monthRange(monthOffset);
        setSending(true);
        try {
            await sendTaxReport(storeId, from, to, force);
            Alert.alert('발송 완료', `${label} 인건비 내역서를 세무사에게 보냈어요.`);
            load();
        } catch (e: any) {
            const errorCode = e?.response?.data?.errorCode;
            if (errorCode === 'TAX_REPORT_ALREADY_SENT') {
                Alert.alert('이미 발송된 기간이에요', '같은 정산기간에 발송한 이력이 있어요. 다시 보낼까요?', [
                    {text: '취소', style: 'cancel'},
                    {text: '다시 보내기', onPress: () => doSend(true)},
                ]);
            } else {
                Alert.alert('발송 실패', e?.response?.data?.message ?? '잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setSending(false);
        }
    };

    const confirmSend = () => {
        const {label} = monthRange(monthOffset);
        if (!savedEmail) {
            Alert.alert('세무사 이메일 필요', '먼저 세무사 이메일을 등록해 주세요.');
            return;
        }
        Alert.alert(
            '세무사에게 발송',
            `${label} 확정 급여의 인건비 내역서(PDF+CSV)를\n${savedEmail} 로 보낼까요?\n\n확정·지급완료 급여만 포함돼요.`,
            [
                {text: '취소', style: 'cancel'},
                {text: '보내기', onPress: () => doSend(false)},
            ],
        );
    };

    const {label: monthLabel} = monthRange(monthOffset);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세무사 송부" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label={sending ? '발송 중…' : `${monthLabel} 내역서 보내기`}
                    disabled={sending || loading}
                    onPress={confirmSend}
                />
            }>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="정보를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        세무사 이메일
                    </AppText>
                    <AppCard variant="flat" style={styles.card}>
                        <AppInput
                            label="신고 자료를 받을 이메일"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="cpa@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <AppButton
                            label={savingEmail ? '저장 중…' : '이메일 저장'}
                            variant="secondary"
                            size="sm"
                            disabled={savingEmail || email.trim() === (savedEmail ?? '')}
                            onPress={saveEmail}
                        />
                    </AppCard>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        정산기간
                    </AppText>
                    <AppCard variant="flat" style={styles.card}>
                        <View style={styles.monthRow}>
                            <TouchableOpacity
                                style={styles.monthArrow}
                                onPress={() => setMonthOffset(o => o - 1)}
                                accessibilityLabel="이전 달">
                                <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
                            </TouchableOpacity>
                            <AppText variant="titleMd">{monthLabel}</AppText>
                            <TouchableOpacity
                                style={styles.monthArrow}
                                onPress={() => setMonthOffset(o => Math.min(0, o + 1))}
                                accessibilityLabel="다음 달">
                                <Ionicons
                                    name="chevron-forward"
                                    size={22}
                                    color={monthOffset >= 0 ? c.textTertiary : c.textPrimary}
                                />
                            </TouchableOpacity>
                        </View>
                        <AppText variant="caption" tone="tertiary">
                            확정(CONFIRMED)·지급완료(PAID) 급여만 포함돼요. 작성중 급여는 정산에서 먼저 확정해 주세요.
                        </AppText>
                    </AppCard>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        발송 이력
                    </AppText>
                    {history.length === 0 ? (
                        <EmptyState
                            title="발송 이력이 없어요"
                            description="정산기간을 골라 세무사에게 인건비 내역서를 보내 보세요."
                        />
                    ) : (
                        history.map(log => (
                            <AppCard key={log.id} variant="flat" style={styles.card}>
                                <View style={styles.historyHeader}>
                                    <AppText variant="titleMd">
                                        {log.periodStart} ~ {log.periodEnd}
                                    </AppText>
                                    <AppBadge
                                        label={log.status === 'SENT' ? '발송됨' : '실패'}
                                        tone={log.status === 'SENT' ? 'success' : 'error'}
                                    />
                                </View>
                                <AppText variant="caption" tone="secondary">
                                    {log.recipientEmail} · 급여 {log.payrollCount}건 · 세전 {won(log.totalGrossWage)}
                                </AppText>
                                <AppText variant="caption" tone="tertiary">
                                    {fmtDateTime(log.sentAt)}
                                    {log.failReason ? ` · ${log.failReason}` : ''}
                                </AppText>
                            </AppCard>
                        ))
                    )}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    card: {marginTop: spacing.xs, gap: spacing.sm},
    monthRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    monthArrow: {padding: spacing.xs},
    historyHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
});

export default TaxReportScreen;
