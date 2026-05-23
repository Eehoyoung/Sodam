import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput as RNTextInput,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Badge from '../../../common/components/data-display/Badge';
import Button from '../../../common/components/form/Button';
import api from '../../../common/utils/api';

type TabKey = 'INFO' | 'ATTENDANCE' | 'SALARY' | 'TIMEOFF';

interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    appliedHourlyWage?: number;
    hireDate?: string;
    isActive?: boolean;
    memo?: string;
}

interface RouteParams {
    employeeId: number;
    storeId: number;
}

const TABS: Array<{key: TabKey; label: string}> = [
    {key: 'INFO', label: '정보'},
    {key: 'ATTENDANCE', label: '출퇴근'},
    {key: 'SALARY', label: '급여'},
    {key: 'TIMEOFF', label: '연차'},
];

/**
 * 사장 직원 상세 (PRD_OWNER S-201).
 *
 * 한 직원의 모든 정보를 4 탭으로 표시.
 *   - 정보: 프로필 + 시급 + 메모
 *   - 출퇴근: 최근 기록 (월별 미니뷰는 P1)
 *   - 급여: 월별 명세서 리스트
 *   - 연차: 잔여 + 신청 이력 (Phase 2)
 */
const EmployeeDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const {employeeId, storeId}: RouteParams = route.params ?? {};

    const [tab, setTab] = useState<TabKey>('INFO');
    const [emp, setEmp] = useState<Employee | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<any>(`/api/user/${employeeId}`);
                const data = res.data?.data ?? res.data;
                setEmp({
                    id: data.id,
                    name: data.name ?? '직원',
                    email: data.email ?? '',
                    role: data.userGrade ?? data.role ?? 'EMPLOYEE',
                });
            } catch (_) {/* fallback to placeholder */}
            try {
                const wageRes = await api.get<{appliedHourlyWage?: number}>(
                    `/api/wages/employee/${employeeId}/store/${storeId}`,
                );
                const wage = (wageRes.data as any)?.appliedHourlyWage
                    ?? (wageRes.data as any)?.customHourlyWage;
                if (wage) setEmp(e => (e ? {...e, appliedHourlyWage: wage} : e));
            } catch (_) {/* ignore */}
        })();
    }, [employeeId, storeId]);

    const initials = useMemo(() => (emp?.name ?? '?').slice(0, 1), [emp]);

    if (!emp) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Text style={styles.loading}>직원 정보를 불러오는 중…</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.name}>{emp.name}</Text>
                        <Text style={styles.email}>{emp.email}</Text>
                        <View style={styles.headerMeta}>
                            <Badge text={roleLabel(emp.role)} type="primary" />
                            {emp.isActive === false ? (
                                <Badge text="비활성" type="neutral" />
                            ) : (
                                <Badge text="활성" type="success" />
                            )}
                        </View>
                    </View>
                </View>

                {/* Quick info */}
                <View style={styles.quickRow}>
                    <QuickStat
                        icon="💰"
                        label="시급"
                        value={
                            emp.appliedHourlyWage
                                ? `${emp.appliedHourlyWage.toLocaleString('ko-KR')}원`
                                : '미설정'
                        }
                    />
                    <QuickStat icon="📅" label="입사일" value={emp.hireDate ?? '—'} />
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    {TABS.map(t => (
                        <Pressable
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={({pressed}) => [
                                styles.tab,
                                tab === t.key && styles.tabActive,
                                pressed && {opacity: 0.7},
                            ]}
                        >
                            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.tabContent}>
                    {tab === 'INFO' && <InfoTab emp={emp} />}
                    {tab === 'ATTENDANCE' && <AttendanceTab employeeId={emp.id} storeId={storeId} />}
                    {tab === 'SALARY' && <SalaryTab employeeId={emp.id} navigation={navigation} />}
                    {tab === 'TIMEOFF' && <TimeOffTab />}
                </View>

                {/* Memo */}
                <MemoEditor storeId={storeId} employeeId={emp.id} />

                {/* Bottom actions */}
                <View style={styles.actionsRow}>
                    <Button
                        title="시급 변경"
                        onPress={() =>
                            Alert.alert(
                                '안내',
                                '시급 변경 화면(S-501c)은 P1 단계에서 연결됩니다.\nBE 호출은 PUT /api/wages/employee.',
                            )
                        }
                        variant="outline"
                        size="md"
                        style={styles.actionBtn}
                    />
                    <Button
                        title={emp.isActive === false ? '활성화' : '비활성화'}
                        onPress={() =>
                            Alert.alert(
                                '확인',
                                emp.isActive === false
                                    ? '직원을 활성화할까요?'
                                    : '직원을 비활성화할까요? 출근/급여 기록은 보존돼요.',
                            )
                        }
                        variant="destructive"
                        size="md"
                        style={styles.actionBtn}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const QuickStat: React.FC<{icon: string; label: string; value: string}> = ({icon, label, value}) => (
    <Card style={styles.quickStat} bordered>
        <Text style={styles.quickStatIcon}>{icon}</Text>
        <Text style={styles.quickStatLabel}>{label}</Text>
        <Text style={styles.quickStatValue}>{value}</Text>
    </Card>
);

const MemoEditor: React.FC<{storeId: number; employeeId: number}> = ({storeId, employeeId}) => {
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<{memo: string}>(
                    `/api/stores/${storeId}/employees/${employeeId}/memo`,
                );
                setMemo(res.data?.memo ?? '');
            } catch (_) {/* ignore */} finally {
                setLoading(false);
            }
        })();
    }, [storeId, employeeId]);

    const save = async () => {
        setSaving(true);
        try {
            await api.put(`/api/stores/${storeId}/employees/${employeeId}/memo`, {memo});
            Alert.alert('완료', '메모가 저장됐어요.');
        } catch (_) {
            Alert.alert('실패', '저장에 실패했어요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card bordered style={styles.memoCard}>
            <Text style={styles.memoTitle}>📝 사장님 메모 (직원에게 보이지 않아요)</Text>
            <RNTextInput
                value={memo}
                onChangeText={setMemo}
                multiline
                editable={!loading}
                placeholder="예: 마감 잘 함 / 주말 가능 등"
                placeholderTextColor={tokens.colors.textTertiary}
                style={styles.memoInput}
                maxLength={500}
            />
            <Text style={styles.memoCount}>{memo.length} / 500자</Text>
            <Button title="메모 저장" onPress={save} variant="primary" size="sm" loading={saving} />
        </Card>
    );
};

const InfoTab: React.FC<{emp: Employee}> = ({emp}) => (
    <View style={styles.section}>
        <KV label="이메일" value={emp.email || '-'} />
        <KV label="역할" value={roleLabel(emp.role)} />
        <KV
            label="시급"
            value={
                emp.appliedHourlyWage
                    ? `${emp.appliedHourlyWage.toLocaleString('ko-KR')}원/시간`
                    : '매장 기본 시급 사용'
            }
        />
        <KV label="입사일" value={emp.hireDate ?? '-'} />
    </View>
);

const AttendanceTab: React.FC<{employeeId: number; storeId: number}> = ({employeeId, storeId}) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const now = new Date();
                const res = await api.get<any[]>(
                    `/api/attendance/employee/${employeeId}/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
                );
                setItems((res.data as any[]) ?? []);
            } catch (_) {
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [employeeId, storeId]);

    if (loading) return <Text style={styles.empty}>불러오는 중…</Text>;
    if (items.length === 0)
        return <Text style={styles.empty}>이번 달 출근 기록이 아직 없어요.</Text>;

    return (
        <View style={styles.section}>
            {items.slice(0, 7).map((a, idx) => (
                <View key={idx} style={styles.attRow}>
                    <Text style={styles.attDate}>{formatDate(a.checkInTime)}</Text>
                    <Text style={styles.attTime}>
                        {shortTime(a.checkInTime)} ~ {a.checkOutTime ? shortTime(a.checkOutTime) : '근무중'}
                    </Text>
                </View>
            ))}
        </View>
    );
};

const SalaryTab: React.FC<{employeeId: number; navigation: any}> = ({employeeId, navigation}) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<any[]>(`/api/payroll/employee/${employeeId}`);
                setItems((res.data as any[]) ?? []);
            } catch (_) {
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [employeeId]);

    if (loading) return <Text style={styles.empty}>불러오는 중…</Text>;
    if (items.length === 0) return <Text style={styles.empty}>발급된 급여 명세서가 없어요.</Text>;

    return (
        <View style={styles.section}>
            {items.map((p, idx) => (
                <Pressable
                    key={idx}
                    onPress={() => navigation.navigate('SalaryDetail', {payrollId: p.id})}
                    style={({pressed}) => [styles.salaryRow, pressed && {opacity: 0.7}]}
                >
                    <View>
                        <Text style={styles.salaryMonth}>{formatMonth(p.startDate)}</Text>
                        <Text style={styles.salaryAmount}>
                            {(p.netWage ?? 0).toLocaleString('ko-KR')}원
                        </Text>
                    </View>
                    <Badge text={payrollStatusLabel(p.status)} type={payrollStatusTone(p.status)} />
                </Pressable>
            ))}
        </View>
    );
};

const TimeOffTab: React.FC = () => (
    <View style={styles.section}>
        <Text style={styles.empty}>
            연차 관리는 Phase 2 에 도입돼요.{'\n'}현재는 BE TimeOff 도메인만 준비된 상태예요.
        </Text>
    </View>
);

const KV: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>{label}</Text>
        <Text style={styles.kvValue}>{value}</Text>
    </View>
);

function roleLabel(role: string): string {
    if (role === 'MASTER') return '사장';
    if (role === 'EMPLOYEE') return '직원';
    if (role === 'MANAGER') return '매니저';
    return '일반';
}
function formatDate(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
function shortTime(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatMonth(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
function payrollStatusLabel(s: string): string {
    switch (s) {
        case 'PAID':
            return '지급 완료';
        case 'APPROVED':
            return '발급';
        case 'CANCELLED':
            return '취소';
        case 'DRAFT':
        default:
            return '준비 중';
    }
}
function payrollStatusTone(s: string): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
    if (s === 'PAID') return 'success';
    if (s === 'CANCELLED') return 'danger';
    if (s === 'APPROVED') return 'primary';
    return 'warning';
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    loading: {textAlign: 'center', padding: tokens.spacing.huge, color: tokens.colors.textSecondary},
    header: {flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg},
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: tokens.colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 28,
        color: tokens.colors.brandPrimary,
        fontWeight: tokens.typography.weights.bold,
    },
    headerText: {flex: 1, gap: 2},
    name: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.3,
    },
    email: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary},
    headerMeta: {flexDirection: 'row', gap: tokens.spacing.xs, marginTop: tokens.spacing.xs},
    quickRow: {flexDirection: 'row', gap: tokens.spacing.md, marginBottom: tokens.spacing.lg},
    quickStat: {flex: 1, alignItems: 'flex-start'},
    quickStatIcon: {fontSize: 22, marginBottom: tokens.spacing.xs},
    quickStatLabel: {fontSize: tokens.typography.sizes.xs, color: tokens.colors.textTertiary},
    quickStatValue: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: 2,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: tokens.colors.surfaceMuted,
        borderRadius: tokens.radius.lg,
        padding: 4,
        marginBottom: tokens.spacing.md,
    },
    tab: {flex: 1, alignItems: 'center', paddingVertical: tokens.spacing.sm, borderRadius: tokens.radius.md},
    tabActive: {backgroundColor: tokens.colors.background, ...tokens.shadow.sm},
    tabText: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textSecondary,
        fontWeight: tokens.typography.weights.medium,
    },
    tabTextActive: {color: tokens.colors.brandPrimary, fontWeight: tokens.typography.weights.bold},
    tabContent: {minHeight: 200},
    section: {paddingVertical: tokens.spacing.sm},
    kvRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm},
    kvLabel: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm},
    kvValue: {color: tokens.colors.textPrimary, fontSize: tokens.typography.sizes.md, fontWeight: '500'},
    attRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors.divider,
    },
    attDate: {fontSize: tokens.typography.sizes.md, color: tokens.colors.textPrimary, fontWeight: '500'},
    attTime: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary, fontVariant: ['tabular-nums']},
    salaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors.divider,
    },
    salaryMonth: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary},
    salaryAmount: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: 2,
    },
    empty: {
        textAlign: 'center',
        color: tokens.colors.textTertiary,
        paddingVertical: tokens.spacing.xl,
        lineHeight: 22,
    },
    memoCard: {marginTop: tokens.spacing.md, backgroundColor: tokens.colors.warningBg, borderColor: tokens.colors.warning},
    memoTitle: {fontSize: tokens.typography.sizes.sm, fontWeight: '600', color: tokens.colors.textPrimary, marginBottom: tokens.spacing.sm},
    memoInput: {
        backgroundColor: tokens.colors.background,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.md,
        minHeight: 80,
        textAlignVertical: 'top',
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textPrimary,
    },
    memoCount: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.textTertiary,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: tokens.spacing.sm,
    },
    actionsRow: {flexDirection: 'row', gap: tokens.spacing.md, marginTop: tokens.spacing.lg},
    actionBtn: {flex: 1},
});

export default EmployeeDetailScreen;
