/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {
    AppToast,
    ConfirmSheet,
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AmountText,
    AppText,
    CtaStack,
    ScreenContainer,
    SegmentedControl,
    BadgeTone,
} from '../../../common/components/ds';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput as RNTextInput, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute, useFocusEffect, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import api from '../../../common/utils/api';
import {WageEditSheet, WageEditValues} from '../components/StoreSheets';
import wageService, {EmploymentType} from '../../wage/services/wageService';
import contractService from '../../contract/services/contractService';
import ManagerAppointSection from '../../manager/screens/ManagerAppointSection';

type TabKey = 'INFO' | 'ATTENDANCE' | 'SALARY' | 'TIMEOFF';

interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    appliedHourlyWage?: number;
    /** 고용형태 — 미설정(구 데이터)이면 undefined = 시급제 취급 */
    employmentType?: EmploymentType;
    /** 월급(원, 세전) — 월급제 전용 */
    monthlySalary?: number;
    /** null/undefined = 매장 정책 따름 */
    socialInsuranceEnrolled?: boolean | null;
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

const useStyles = () => {
    const c = useThemeColors();
    return useMemo(() => makeStyles(c), [c]);
};

/**
 * 사장 직원 상세 (PRD_OWNER S-201) — v3 토스식.
 * 히어로: 직원명 + 적용 시급/월급(AmountText) + 활성 배지. 하단 CTA: 급여 설정(시급제·월급제·4대보험).
 * saveWage(POST /api/wages/employee)·toggleActive(PUT .../active)·memo 로직 보존.
 */
const EmployeeDetailScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'EmployeeDetail'>>();
    const styles = useStyles();
    const c = useThemeColors();
    const {employeeId, storeId}: RouteParams = route.params ?? ({} as RouteParams);

    // 포커스마다 재조회 트리거 — 시급 변경/계약 발송 등 하위 화면에서 돌아왔을 때
    // 직원 정보·시급이력·근태를 최신화한다(아래 모든 로딩 effect 의 deps 에 포함).
    const [refreshKey, setRefreshKey] = useState(0);
    useFocusEffect(
        useCallback(() => {
            setRefreshKey(k => k + 1);
        }, []),
    );

    const [tab, setTab] = useState<TabKey>('INFO');
    const [emp, setEmp] = useState<Employee | null>(null);
    const [togglingActive, setTogglingActive] = useState(false);
    const [wageSheet, setWageSheet] = useState(false);
    const [savingWage, setSavingWage] = useState(false);
    const [draftContractCount, setDraftContractCount] = useState(0);

    // 중요 근로조건은 즉시 수정하지 않고 변경계약 전자서명 완료 후 효력일에 적용한다.
    const saveWage = async (values: WageEditValues) => {
        if (savingWage) {
            return;
        }
        const isMonthly = values.employmentType === 'MONTHLY_SALARY';
        if (isMonthly && values.monthlySalary < 1) {
            AppToast.error('월급제를 선택하면 월급을 입력해야 해요.');
            return;
        }
        setSavingWage(true);
        let createdAmendmentId: number | null = null;
        try {
            const hourlyWage = values.hourlyWage > 0
                ? values.hourlyWage
                : emp?.appliedHourlyWage;
            if (!isMonthly && !hourlyWage) {
                AppToast.error('변경할 시급을 입력해 주세요.');
                return;
            }
            const amendment = await wageService.createEmploymentAmendment(storeId, {
                employeeId,
                effectiveDate: new Date().toLocaleDateString('en-CA'),
                employmentType: values.employmentType,
                hourlyWage: isMonthly ? undefined : hourlyWage,
                monthlySalary: isMonthly ? values.monthlySalary : undefined,
            });
            createdAmendmentId = amendment.id;
            const signature = await wageService.sendEmploymentAmendment(storeId, amendment.id);
            setWageSheet(false);
            navigation.navigate('ElectronicSign', {envelopeId: signature.envelopeId});
        } catch (err: any) {
            if (createdAmendmentId !== null) {
                await wageService.cancelEmploymentAmendment(storeId, createdAmendmentId).catch(() => undefined);
            }
            const data = err?.response?.data;
            if (data?.errorCode === 'WAGE_BELOW_MINIMUM') {
                AppToast.error(
                    data?.message || '최저임금 월 환산액보다 낮은 월급은 설정할 수 없어요. 금액을 확인해 주세요.',
                );
            } else if (data?.errorCode === 'MONTHLY_SALARY_REQUIRED') {
                AppToast.error('월급제를 선택하면 월급을 입력해야 해요.');
            } else {
                AppToast.error('급여 설정에 실패했어요. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setSavingWage(false);
        }
    };

    // 직원 활성/비활성 — PUT /api/stores/{storeId}/employees/{employeeId}/active?active=<bool>
    const toggleActive = async () => {
        if (!emp || togglingActive) {
            return;
        }
        const next = emp.isActive === false; // 현재 비활성이면 활성화(true), 아니면 비활성화(false)
        setTogglingActive(true);
        try {
            const res = await api.put<{employeeId: number; active: boolean}>(
                `/api/stores/${storeId}/employees/${employeeId}/active`,
                undefined,
                {params: {active: next}},
            );
            const applied = (res.data as any)?.active ?? next;
            setEmp(e => (e ? {...e, isActive: applied} : e));
            AppToast.success(applied ? '직원을 활성화했어요.' : '직원을 비활성화했어요.');
        } catch (_) {
            AppToast.error('상태 변경에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setTogglingActive(false);
        }
    };

    const confirmToggleActive = () =>
        ConfirmSheet.confirm({
            title: emp?.isActive === false ? '직원을 활성화할까요?' : '직원을 비활성화할까요?',
            description:
                emp?.isActive === false
                    ? '활성화하면 출퇴근 기록과 급여 산정이 다시 시작돼요.'
                    : '비활성화해도 기존 출근·급여 기록은 그대로 보존돼요.',
            primary: {
                label: emp?.isActive === false ? '활성화' : '비활성화',
                destructive: emp?.isActive !== false,
                onPress: toggleActive,
            },
            secondary: {label: '취소'},
        });

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
                // 고용형태·월급·4대보험까지 포함된 EmployeeWageInfoDto 사용
                // (GET /api/wages/employee/... 는 적용 시급 숫자만 반환)
                const info = await wageService.getEmployeeWageInfo(employeeId, storeId);
                if (info) {
                    setEmp(e => (e ? {
                        ...e,
                        // 매장 기본 시급 사용 중이면 히어로에 '매장 기본'을 유지(기존 표기 의미 보존)
                        appliedHourlyWage: info.useStoreStandardWage
                            ? undefined
                            : (info.customHourlyWage ?? info.appliedHourlyWage ?? undefined),
                        employmentType: info.employmentType ?? undefined,
                        monthlySalary: info.monthlySalary ?? undefined,
                        socialInsuranceEnrolled: info.socialInsuranceEnrolled ?? null,
                    } : e));
                }
            } catch (_) {/* ignore */}
        })();
        // refreshKey: 포커스 복귀 시 재조회 트리거(아래 deps 에 포함)
    }, [employeeId, storeId, refreshKey]);

    useEffect(() => {
        (async () => {
            try {
                const drafts = await contractService.getDrafts(storeId, employeeId);
                setDraftContractCount(drafts.length);
            } catch (_) {/* ignore */}
        })();
    }, [employeeId, storeId, refreshKey]);

    const initials = useMemo(() => (emp?.name ?? '?').slice(0, 1), [emp]);
    const tabIndex = TABS.findIndex(t => t.key === tab);
    const isInactive = emp?.isActive === false;
    const isMonthlyEmp = emp?.employmentType === 'MONTHLY_SALARY' && !!emp?.monthlySalary;

    if (!emp) {
        return (
            <ScreenContainer header={<AppHeader title="직원 상세" onBack={() => navigation.goBack()} />}>
                <AppText variant="bodyMd" tone="secondary" center style={styles.loading}>
                    직원 정보를 불러오는 중…
                </AppText>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="직원 상세" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="급여 설정" onPress={() => setWageSheet(true)} loading={savingWage} />
                    <AppButton
                        label={isInactive ? '직원 활성화' : '직원 비활성화'}
                        variant={isInactive ? 'secondary' : 'destructive'}
                        onPress={confirmToggleActive}
                        loading={togglingActive}
                    />
                </CtaStack>
            }>
            {/* 히어로: 직원명 + 적용 시급 */}
            <View style={styles.hero}>
                <View style={[styles.avatar, {backgroundColor: c.brandPrimarySoft}]}>
                    <Text style={[styles.avatarText, {color: c.brandPrimary}]}>{initials}</Text>
                </View>
                <View style={styles.heroText}>
                    <AppText variant="headingSm" numberOfLines={1}>{emp.name}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.email}>
                        {emp.email || '이메일 미등록'}
                    </AppText>
                </View>
                <AppBadge label={isInactive ? '비활성' : '활성'} tone={isInactive ? 'neutral' : 'success'} />
            </View>

            <AppCard variant="hero" style={styles.wageCard}>
                <AppText variant="caption" tone="secondary">
                    {isMonthlyEmp ? '적용 월급' : '적용 시급'}
                </AppText>
                <AmountText size={40} tone="brand" style={styles.wageAmount}>
                    {isMonthlyEmp
                        ? wageService.formatMonthlyPay(emp.monthlySalary ?? 0)
                        : emp.appliedHourlyWage
                            ? `${emp.appliedHourlyWage.toLocaleString('ko-KR')}원`
                            : '매장 기본'}
                </AmountText>
                <AppText variant="caption" tone="tertiary" style={styles.wageSub}>
                    {isMonthlyEmp
                        ? '월급제(세전 기준)가 적용 중이에요.'
                        : emp.appliedHourlyWage
                            ? '직원 개별 시급이 적용 중이에요.'
                            : '매장 기준 시급을 따라요.'}
                </AppText>
            </AppCard>

            <SegmentedControl
                options={TABS.map(t => t.label)}
                value={tabIndex < 0 ? 0 : tabIndex}
                onChange={i => setTab(TABS[i].key)}
                style={styles.segment}
            />

            <View style={styles.tabContent}>
                {tab === 'INFO' && <InfoTab emp={emp} />}
                {/* key={refreshKey}: 포커스 복귀 시 탭을 remount 해 시급/근태 데이터를 재조회한다. */}
                {tab === 'ATTENDANCE' && <AttendanceTab key={refreshKey} employeeId={emp.id} storeId={storeId} />}
                {tab === 'SALARY' && <SalaryTab key={refreshKey} employeeId={emp.id} navigation={navigation} />}
                {tab === 'TIMEOFF' && <TimeOffTab />}
            </View>

            <MemoEditor storeId={storeId} employeeId={emp.id} />

            <ManagerAppointSection
                storeId={storeId}
                employeeId={emp.id}
                employeeName={emp.name}
                navigation={navigation}
            />

            <View style={styles.contractRow}>
                <AppListItem
                    title="즉시 보너스 지급"
                    subtitle="오늘 바빠서 고생한 직원에게 바로 보너스를 기록하고, 다음 급여에 자동 합산해요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('SendBonus', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="근로계약서 보내기"
                    subtitle="근로조건을 작성해 직원에게 보내고 서명을 받을 수 있어요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('SendContract', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                {draftContractCount > 0 && (
                    <AppListItem
                        title={`임시저장된 근로계약서 ${draftContractCount}건`}
                        subtitle="아직 발송되지 않았어요. 이어서 발송하거나 삭제할 수 있어요."
                        right="›"
                        onPress={() =>
                            navigation.navigate('DraftContracts', {
                                storeId,
                                employeeId: emp.id,
                                employeeName: emp.name,
                            })
                        }
                    />
                )}
                <AppListItem
                    title="서류함"
                    subtitle="보건증 등 서류 보관 · 만료 임박 시 알림"
                    right="›"
                    onPress={() =>
                        navigation.navigate('EmployeeDocuments', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="휴게 기록"
                    subtitle="휴게를 실제로 부여한 기록을 남겨 임금체불 진정에 대비해요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('BreakRecord', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="연소근로자 확인"
                    subtitle="만 18세 미만이면 근로시간·야간 제한·친권자 동의를 안내해 드려요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('MinorGuard', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="근무 시프트"
                    subtitle="근무 일정을 등록하면 직원이 본인 일정을 확인할 수 있어요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('EditShift', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="온보딩 현황"
                    subtitle="계약·시급·첫 출근 진행 상태를 확인해요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('Onboarding', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
                <AppListItem
                    title="증거 패키지"
                    subtitle="근태·급여·계약·시급이력을 한 번에 묶어 분쟁 대비 자료로 보관해요."
                    right="›"
                    onPress={() =>
                        navigation.navigate('EvidencePackage', {
                            storeId,
                            employeeId: emp.id,
                            employeeName: emp.name,
                        })
                    }
                />
            </View>

            <WageEditSheet
                visible={wageSheet}
                onClose={() => setWageSheet(false)}
                employeeName={emp.name}
                initialEmploymentType={emp.employmentType}
                initialMonthlySalary={emp.monthlySalary}
                initialSocialInsuranceEnrolled={emp.socialInsuranceEnrolled}
                onSave={saveWage}
            />
        </ScreenContainer>
    );
};

const MemoEditor: React.FC<{storeId: number; employeeId: number}> = ({storeId, employeeId}) => {
    const styles = useStyles();
    const c = useThemeColors();
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
            AppToast.success('메모가 저장됐어요.');
        } catch (_) {
            AppToast.error('저장에 실패했어요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppCard variant="warm" style={styles.memoCard}>
            <View style={styles.memoTitleRow}>
                <Ionicons name="document-text-outline" size={18} color={c.textSecondary} />
                <AppText variant="titleMd" style={styles.memoTitle}>사장님 메모</AppText>
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.memoHint}>
                직원에게 보이지 않아요.
            </AppText>
            <RNTextInput
                value={memo}
                onChangeText={setMemo}
                multiline
                editable={!loading}
                placeholder="예: 마감 잘 함 / 주말 가능 등"
                placeholderTextColor={c.textTertiary}
                style={[styles.memoInput, {backgroundColor: c.background, color: c.textPrimary}]}
                maxLength={500}
            />
            <Text style={[styles.memoCount, {color: c.textTertiary}]}>{memo.length} / 500자</Text>
            <AppButton label="메모 저장" onPress={save} variant="outline" size="md" loading={saving} />
        </AppCard>
    );
};

const InfoTab: React.FC<{emp: Employee}> = ({emp}) => {
    const styles = useStyles();
    const isMonthly = emp.employmentType === 'MONTHLY_SALARY' && !!emp.monthlySalary;
    return (
        <View style={styles.section}>
            <KV label="이메일" value={emp.email || '-'} />
            <KV label="역할" value={roleLabel(emp.role)} />
            <KV label="고용형태" value={isMonthly ? '월급제' : '시급제'} />
            <KV
                label={isMonthly ? '월급' : '시급'}
                value={
                    isMonthly
                        ? wageService.formatMonthlyPay(emp.monthlySalary ?? 0)
                        : emp.appliedHourlyWage
                            ? `${emp.appliedHourlyWage.toLocaleString('ko-KR')}원/시간`
                            : '매장 기본 시급 사용'
                }
            />
            <KV label="4대보험" value={insuranceLabel(emp.socialInsuranceEnrolled)} />
            <KV label="입사일" value={emp.hireDate ?? '-'} last />
        </View>
    );
};

const AttendanceTab: React.FC<{employeeId: number; storeId: number}> = ({employeeId, storeId}) => {
    const styles = useStyles();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const now = new Date();
                const res = await api.get<any[]>(
                    `/api/attendance/employee/${employeeId}/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
                );
                setItems((res.data) ?? []);
            } catch (_) {
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [employeeId, storeId]);

    if (loading) {return <Empty text="불러오는 중…" />;}
    if (items.length === 0) {return <Empty text="이번 달 출근 기록이 아직 없어요." />;}

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

const SalaryTab: React.FC<{employeeId: number; navigation: NativeStackNavigationProp<HomeStackParamList>}> = ({employeeId, navigation}) => {
    const styles = useStyles();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<any[]>(`/api/payroll/employee/${employeeId}`);
                setItems((res.data) ?? []);
            } catch (_) {
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [employeeId]);

    if (loading) {return <Empty text="불러오는 중…" />;}
    if (items.length === 0) {return <Empty text="발급된 급여 명세서가 없어요." />;}

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
                    <AppBadge label={payrollStatusLabel(p.status)} tone={payrollStatusTone(p.status)} />
                </Pressable>
            ))}
        </View>
    );
};

const TimeOffTab: React.FC = () => (
    <Empty text={'연차 관리는 Phase 2 에 도입돼요.\n현재는 BE TimeOff 도메인만 준비된 상태예요.'} />
);

const Empty: React.FC<{text: string}> = ({text}) => {
    const styles = useStyles();
    return <Text style={styles.empty}>{text}</Text>;
};

const KV: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => {
    const styles = useStyles();
    return (
        <View style={[styles.kvRow, last && styles.kvRowLast]}>
            <Text style={styles.kvLabel}>{label}</Text>
            <Text style={styles.kvValue}>{value}</Text>
        </View>
    );
};

function insuranceLabel(enrolled?: boolean | null): string {
    if (enrolled === null || enrolled === undefined) {return '매장 정책 따름';}
    return enrolled ? '4대보험 가입' : '3.3% 원천징수';
}
function roleLabel(role: string): string {
    if (role === 'MASTER') {return '사장';}
    if (role === 'EMPLOYEE') {return '직원';}
    if (role === 'MANAGER') {return '매니저';}
    return '일반';
}
function formatDate(iso?: string): string {
    if (!iso) {return '-';}
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
function shortTime(iso?: string): string {
    if (!iso) {return '-';}
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatMonth(iso?: string): string {
    if (!iso) {return '-';}
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
function payrollStatusTone(s: string): BadgeTone {
    if (s === 'PAID') {return 'success';}
    if (s === 'CANCELLED') {return 'error';}
    if (s === 'APPROVED') {return 'info';}
    return 'warning';
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    loading: {paddingTop: tokens.spacing.huge},
    hero: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: tokens.spacing.md},
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    avatarText: {fontSize: 24, fontWeight: tokens.typography.weights.bold},
    heroText: {flex: 1, minWidth: 0},
    email: {marginTop: 2},
    wageCard: {marginTop: tokens.spacing.xxl},
    wageAmount: {marginTop: tokens.spacing.xs},
    wageSub: {marginTop: tokens.spacing.xs},
    segment: {marginTop: tokens.spacing.xxl},
    tabContent: {minHeight: 160, marginTop: tokens.spacing.md},
    contractRow: {marginTop: tokens.spacing.lg},
    section: {paddingVertical: tokens.spacing.xs},
    kvRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    kvRowLast: {borderBottomWidth: 0},
    kvLabel: {color: c.textSecondary, fontSize: tokens.typography.sizes.md},
    kvValue: {color: c.textPrimary, fontSize: tokens.typography.sizes.md, fontWeight: '600' as const},
    attRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    attDate: {fontSize: tokens.typography.sizes.md, color: c.textPrimary, fontWeight: '600' as const},
    attTime: {fontSize: tokens.typography.sizes.sm, color: c.textSecondary, fontVariant: ['tabular-nums' as const]},
    salaryRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    salaryMonth: {fontSize: tokens.typography.sizes.sm, color: c.textSecondary},
    salaryAmount: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        marginTop: 2,
    },
    empty: {
        textAlign: 'center' as const,
        color: c.textTertiary,
        paddingVertical: tokens.spacing.xl,
        lineHeight: 22,
    },
    memoCard: {marginTop: tokens.spacing.xxl},
    memoTitleRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: tokens.spacing.xs},
    memoTitle: {marginLeft: 2},
    memoHint: {marginTop: 2, marginBottom: tokens.spacing.sm},
    memoInput: {
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        minHeight: 88,
        textAlignVertical: 'top' as const,
        fontSize: tokens.typography.sizes.md,
    },
    memoCount: {
        fontSize: tokens.typography.sizes.xs,
        textAlign: 'right' as const,
        marginTop: 4,
        marginBottom: tokens.spacing.sm,
    },
});

export default EmployeeDetailScreen;
