/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, AppBadge, AppButton, AppCard, AppInput, AppText, CtaStack, HeroNumber, ScreenContainer, StepScaffold} from '../../../common/components/ds';
import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';
import storeService, {StoreSummaryDto} from '../../store/services/storeService';
import payrollService from '../services/payrollService';
import {fetchOvertimeCheck, OvertimeCheck} from '../services/overtimeService';

// 정산 계산 로직 보존을 위한 경량 어댑터 (구식 Badge/Input → DS)
const Badge: React.FC<any> = ({text, type}) => (
    <AppBadge
        label={text}
        tone={type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info'}
    />
);
const Input: React.FC<any> = ({helperText, ...rest}) => <AppInput helper={helperText} {...rest} />;

type Step = 'PERIOD' | 'PREVIEW' | 'CONFIRM' | 'DONE';

interface PayrollPreview {
    payrollId?: number;
    employeeId: number;
    employeeName: string;
    regularHours: number;
    regularWage: number;
    overtimeHours: number;
    overtimeWage: number;
    nightWorkHours: number;
    nightWorkWage: number;
    weeklyAllowance: number;
    bonusWage: number;
    grossWage: number;
    taxAmount: number;
    netWage: number;
    adjustment?: number;
    adjustmentReason?: string;
}

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/**
 * 사장 정산 플로우 (PRD_OWNER S-301) — v3 토스식 진행형 스텝(StepScaffold).
 *
 * 4 단계(한 번에 하나만 묻기):
 *   1) PERIOD  — 매장·기간 선택
 *   2) PREVIEW — 직원별 자동 계산 결과 확인 + 가감 조정 (총액 HeroNumber)
 *   3) CONFIRM — 명세서 발급 + 직원 푸시
 *   4) DONE    — 완료
 *
 * BE 엔드포인트(변경 없음):
 *   - POST /api/payroll/calculate   (storeId, startDate, endDate) → 직원별 미리보기
 *   - PUT  /api/payroll/{id}/issue  (발급 확정)
 */
const PayrollRunScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'PayrollRun'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const storeIdParam = route.params?.storeId;
    const {user} = useAuth();

    const [step, setStep] = useState<Step>('PERIOD');
    const [storeId, setStoreId] = useState<number | null>(storeIdParam ?? null);
    const [stores, setStores] = useState<StoreSummaryDto[]>([]);
    const [startDate, setStartDateValue] = useState(getDefaultStart());
    const [endDate, setEndDateValue] = useState(getDefaultEnd());
    const setStartDate = (value: string) => setStartDateValue(sanitizeDateDigits(value));
    const setEndDate = (value: string) => setEndDateValue(sanitizeDateDigits(value));
    const [previews, setPreviews] = useState<PayrollPreview[]>([]);
    const [loading, setLoading] = useState(false);
    const [stepUpPassword, setStepUpPassword] = useState('');
    // 연장근로 한도(주 52h, §53) 위반 경보 — 정산 미리보기 시점에 조회(B5/L-NEW-02).
    const [overtime, setOvertime] = useState<OvertimeCheck | null>(null);
    // 매장 정산주기의 지급 예정일 — 주기 기본값 적용 시 안내용
    const [cyclePayDate, setCyclePayDate] = useState<string | null>(null);

    // 매장 선택 시 정산주기가 설정돼 있으면 기간 기본값을 주기(시작~마감)로 채운다.
    // 미설정/조회 실패면 기존 달력(이번 달 1일~말일) 기본값 유지.
    useEffect(() => {
        if (!storeId) {
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const period = await storeService.getPayrollCyclePeriod(storeId);
                if (cancelled || !period.configured || !period.startDate || !period.endDate) {
                    return;
                }
                setStartDateValue(period.startDate.replace(/-/g, ''));
                setEndDateValue(period.endDate.replace(/-/g, ''));
                setCyclePayDate(period.paymentDate);
            } catch (_) {
                /* 주기 미조회 시 달력 기본값으로 진행 */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [storeId]);

    // 사장 매장 목록 로드 → 손으로 매장 ID 입력하지 않도록 셀렉터 제공.
    useEffect(() => {
        if (user?.id === undefined) {
            return;
        }
        (async () => {
            try {
                const list = await storeService.getMasterStores(user.id);
                setStores(list);
                // 파라미터로 매장이 안 넘어온 경우 첫 매장을 기본 선택.
                setStoreId(prev => prev ?? list[0]?.id ?? null);
            } catch (_) {/* 셀렉터 없이도 진행 가능 */}
        })();
    }, [user?.id]);

    const totalNet = previews.reduce((s, p) => s + (p.netWage ?? 0) + (p.adjustment ?? 0), 0);

    const goPreview = async () => {
        if (!storeId) {
            AppToast.warn('매장을 선택해 주세요.');
            return;
        }
        if (!isValidDateDigits(startDate) || !isValidDateDigits(endDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        const startDateIso = dateDigitsToIso(startDate);
        const endDateIso = dateDigitsToIso(endDate);
        setLoading(true);
        try {
            const items = await payrollService.calculate({
                storeId,
                startDate: startDateIso,
                endDate: endDateIso,
            });
            setPreviews(items);
            setStep('PREVIEW');
            // 연장근로 한도 경보는 정산을 막지 않는 부가 정보 — 실패해도 정산 흐름 유지.
            loadOvertime(storeId, startDateIso);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '급여 계산 중 오류가 났어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 정산 기간(시작일)이 속한 연·월의 주 52h 초과 여부를 조회한다.
    const loadOvertime = async (sid: number, periodStart: string) => {
        const [yearStr, monthStr] = periodStart.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
            return;
        }
        try {
            setOvertime(await fetchOvertimeCheck(sid, year, month));
        } catch (_) {
            setOvertime(null); // 경보 조회 실패는 조용히 무시(정산 자체는 정상)
        }
    };

    const goConfirm = () => setStep('CONFIRM');

    const issuePayrolls = async () => {
        if (!stepUpPassword) {
            AppToast.warn('급여 확정을 위해 비밀번호를 다시 입력해 주세요.');
            return;
        }
        setLoading(true);
        // BE /issue 가 확정→지급완료를 원자 처리(DRAFT→PAID 직접 전이 400 방지).
        // 항목별 성공/실패를 집계해 부분 발급 상황을 사장에게 정확히 알린다.
        const issuable = previews.filter(p => p.payrollId);
        let success = 0;
        const failed: string[] = [];
        for (const p of issuable) {
            try {
                await payrollService.issue(p.payrollId!, stepUpPassword);
                success += 1;
            } catch (_) {
                failed.push(p.employeeName ?? `#${p.payrollId}`);
            }
        }
        setLoading(false);

        if (failed.length === 0) {
            setStep('DONE');
        } else if (success === 0) {
            AppToast.error('명세서 발급에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } else {
            AppToast.error(`${success}건 발급 완료, ${failed.length}건 실패(${failed.join(', ')}). 실패분만 다시 시도해 주세요.`);
            setStep('DONE');
        }
    };

    // 완료 화면은 ScreenContainer 로 중앙 정렬 (진행바 없음).
    if (step === 'DONE') {
        return (
            <ScreenContainer
                footer={
                    <CtaStack>
                        <AppButton label="홈으로 돌아가기" onPress={() => navigation.goBack()} />
                    </CtaStack>
                }>
                <DoneBlock totalNet={totalNet} count={previews.length} />
            </ScreenContainer>
        );
    }

    if (step === 'PERIOD') {
        return (
            <StepScaffold
                progress={1 / 3}
                title="1단계: 기간 설정"
                subtitle={cyclePayDate
                    ? `매장 정산주기로 기간을 채웠어요. 지급 예정일은 ${cyclePayDate} 이에요.`
                    : '정산할 매장과 기간을 골라 주세요. 기본은 이번 달 1일~말일이에요.'}
                onBack={() => navigation.goBack()}
                footer={
                    <CtaStack>
                        <AppButton label="다음: 미리보기" loading={loading} onPress={goPreview} />
                    </CtaStack>
                }>
                <PeriodForm
                    storeId={storeId}
                    setStoreId={setStoreId}
                    stores={stores}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                />
            </StepScaffold>
        );
    }

    if (step === 'PREVIEW') {
        return (
            <StepScaffold
                progress={2 / 3}
                title="2단계: 미리보기"
                onBack={() => setStep('PERIOD')}
                footer={
                    <CtaStack>
                        <AppButton
                            label="다음: 명세서 발급"
                            disabled={previews.length === 0}
                            onPress={goConfirm}
                        />
                    </CtaStack>
                }>
                <OvertimeWarning overtime={overtime} />
                <PreviewList
                    previews={previews}
                    totalNet={totalNet}
                    onAdjust={(idx: number, amount: number, reason: string) => {
                        const next = [...previews];
                        next[idx] = {...next[idx], adjustment: amount, adjustmentReason: reason};
                        setPreviews(next);
                    }}
                />
            </StepScaffold>
        );
    }

    // CONFIRM
    return (
        <StepScaffold
            progress={1}
            title="3단계: 확인"
            subtitle="발급하면 직원 앱에 자동으로 알림이 전송돼요."
            onBack={() => setStep('PREVIEW')}
            footer={
                <CtaStack>
                    <AppButton label="명세서 발급하기" loading={loading} onPress={issuePayrolls} />
                </CtaStack>
            }>
            <ConfirmBlock
                startDate={startDate}
                endDate={endDate}
                previews={previews}
                totalNet={totalNet}
            />
            <Input
                label="비밀번호 재확인"
                value={stepUpPassword}
                onChangeText={setStepUpPassword}
                secureTextEntry
                autoComplete="current-password"
                helperText="급여 확정 권한과 현재 계정을 한 번 더 확인해요. 비밀번호는 저장되지 않아요."
            />
        </StepScaffold>
    );
};

const StoreSelector: React.FC<{
    stores: StoreSummaryDto[];
    storeId: number | null;
    setStoreId: (id: number | null) => void;
}> = ({stores, storeId, setStoreId}) => {
    const styles = useStyles();
    const c = useThemeColors();

    // 매장 목록을 못 불러온 경우(네트워크 등) 손입력 폴백 — 평소엔 노출되지 않는다.
    if (stores.length === 0) {
        return (
            <Input
                label="매장 ID"
                value={storeId ? String(storeId) : ''}
                onChangeText={(v: string) => setStoreId(parseInt(v, 10) || null)}
                keyboardType="number-pad"
                placeholder="예: 1"
                helperText="매장 목록을 불러오지 못하면 ID를 직접 입력해 주세요."
            />
        );
    }

    return (
        <View style={styles.selectorBlock}>
            <Text style={styles.selectorLabel}>정산 매장</Text>
            <View style={styles.chipRow}>
                {stores.map(s => {
                    const on = s.id === storeId;
                    return (
                        <Pressable
                            key={s.id}
                            onPress={() => setStoreId(s.id)}
                            style={[
                                styles.chip,
                                {borderColor: on ? c.brandPrimary : c.border},
                                on && {backgroundColor: c.surfaceWarm},
                            ]}>
                            <Text
                                style={[
                                    styles.chipText,
                                    {color: on ? c.brandPrimary : c.textSecondary},
                                ]}
                                numberOfLines={1}>
                                {s.storeName}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const PeriodForm: React.FC<any> = ({
    storeId,
    setStoreId,
    stores,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
}) => {
    const storeList: StoreSummaryDto[] = stores ?? [];
    return (
        <View style={fieldStyles.gap}>
            <StoreSelector stores={storeList} storeId={storeId} setStoreId={setStoreId} />
            <Input label="시작일" value={startDate} onChangeText={setStartDate} placeholder="20260601" keyboardType="number-pad" maxLength={8} helperText={DATE_DIGITS_HELPER} />
            <Input label="종료일" value={endDate} onChangeText={setEndDate} placeholder="20260630" keyboardType="number-pad" maxLength={8} helperText={DATE_DIGITS_HELPER} />
        </View>
    );
};

/**
 * 연장근로 한도(주 52h, §53) 초과 경보 카드 (B5/L-NEW-02).
 * 위반 주가 있을 때만 노출 — "OO주 연장 한도 초과(주 54시간)" 식으로 직원·주별 표기.
 * 소담은 연장수당은 계산하면서 한도 위반은 안 막아줬다. 위반 시 형사처벌이라 명세서 발급 전 경보한다.
 */
const OvertimeWarning: React.FC<{overtime: OvertimeCheck | null}> = ({overtime}) => {
    const styles = useStyles();
    const c = useThemeColors();
    if (!overtime || !overtime.hasViolation || overtime.violations.length === 0) {
        return null;
    }
    return (
        <AppCard variant="danger" style={styles.warnCard}>
            <View style={styles.warnHeader}>
                <Ionicons name="warning-outline" size={22} color={c.warning} />
                <AppText variant="headingSm" style={styles.warnTitle}>
                    연장근로 한도(주 52시간) 초과가 있어요
                </AppText>
            </View>
            <AppText variant="bodyMd" tone="secondary" style={styles.warnBody}>
                아래 주는 연장근로 한도(소정 40시간 + 연장 12시간)를 넘었어요. 명세서 발급 전 근무 기록을 확인해 주세요.
            </AppText>
            {overtime.violations.map((v, idx) => (
                <View key={`${v.employeeId}-${v.weekStart}-${idx}`} style={styles.warnRow}>
                    <AppText variant="bodyMd" numberOfLines={1} style={styles.warnEmp}>
                        {v.employeeName}
                    </AppText>
                    <AppText variant="bodyMd" style={styles.warnHours}>
                        {`${v.weekStart} 주 ${v.weeklyHours.toFixed(1)}시간 (+${v.overBy.toFixed(1)})`}
                    </AppText>
                </View>
            ))}
            <AppText variant="caption" tone="tertiary" style={styles.warnDisclaimer}>
                {overtime.disclaimer}
            </AppText>
        </AppCard>
    );
};

const PreviewList: React.FC<any> = ({previews, totalNet, onAdjust}) => {
    const styles = useStyles();
    const c = useThemeColors();
    const [adjustingIdx, setAdjustingIdx] = useState<number | null>(null);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const openAdjust = (idx: number) => {
        const cur = previews[idx];
        setAdjustingIdx(idx);
        setAdjustAmount(cur.adjustment ? String(cur.adjustment) : '');
        setAdjustReason(cur.adjustmentReason ?? '');
    };
    const commitAdjust = () => {
        // eslint-disable-next-line eqeqeq -- intentional == null: matches both null and undefined
        if (adjustingIdx == null) {return;}
        const num = parseInt((adjustAmount || '0').replace(/[^0-9-]/g, ''), 10) || 0;
        const reason = adjustReason.trim();
        if (num !== 0 && reason.length < 2) {
            AppToast.warn('사유를 2자 이상 입력해 주세요.');
            return;
        }
        onAdjust(adjustingIdx, num, reason);
        setAdjustingIdx(null);
        setAdjustAmount('');
        setAdjustReason('');
    };

    return (
        <View style={fieldStyles.gap}>
            <HeroNumber
                label="총 지급 예정"
                value={won(totalNet)}
                sub={`직원 ${previews.length}명`}
                accent
            />

            {previews.length === 0 ? (
                <AppText variant="bodyMd" tone="tertiary" center style={styles.emptyPad}>
                    이 기간에 정산할 출퇴근 기록이 없어요.
                </AppText>
            ) : (
                previews.map((p: PayrollPreview, idx: number) => (
                    <AppCard key={idx} variant="plain" style={styles.empCard}>
                        <View style={styles.empHeader}>
                            <AppText variant="headingSm" numberOfLines={1} style={styles.empName}>{p.employeeName}</AppText>
                            {p.adjustment ? (
                                <Badge
                                    text={`${p.adjustment > 0 ? '+' : ''}${p.adjustment.toLocaleString('ko-KR')}원`}
                                    type={p.adjustment > 0 ? 'success' : 'warning'}
                                />
                            ) : null}
                        </View>
                        <KV label="기본 근무" value={`${p.regularHours.toFixed(1)}h · ${p.regularWage.toLocaleString('ko-KR')}원`} />
                        <KV label="연장" value={`${p.overtimeHours.toFixed(1)}h · ${p.overtimeWage.toLocaleString('ko-KR')}원`} />
                        <KV label="야간" value={`${p.nightWorkHours.toFixed(1)}h · ${p.nightWorkWage.toLocaleString('ko-KR')}원`} />
                        <KV label="주휴" value={`${p.weeklyAllowance.toLocaleString('ko-KR')}원`} />
                        {p.bonusWage > 0 ? (
                            <KV label="즉시 보너스" value={`+${p.bonusWage.toLocaleString('ko-KR')}원`} />
                        ) : null}
                        <View style={[styles.empDivider, {backgroundColor: c.divider}]} />
                        <KV label="세전" value={`${p.grossWage.toLocaleString('ko-KR')}원`} />
                        <KV label="세금 (3.3%)" value={`-${p.taxAmount.toLocaleString('ko-KR')}원`} />
                        <KV label="실수령" value={`${(p.netWage + (p.adjustment ?? 0)).toLocaleString('ko-KR')}원`} highlight />
                        <AppButton
                            label={p.adjustment ? '가감 수정' : '가감 추가'}
                            onPress={() => openAdjust(idx)}
                            variant="ghost"
                            size="sm"
                            fullWidth={false}
                            style={styles.adjustBtn}
                        />
                    </AppCard>
                ))
            )}

            <Modal
                // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                visible={adjustingIdx != null}
                transparent
                animationType="slide"
                onRequestClose={() => setAdjustingIdx(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>가감 추가</Text>
                        <Text style={styles.modalLabel}>금액 (+ / -)</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={adjustAmount}
                            onChangeText={setAdjustAmount}
                            keyboardType="numbers-and-punctuation"
                            placeholder="예: 50000 또는 -20000"
                            placeholderTextColor={c.textTertiary}
                        />
                        <Text style={styles.modalLabel}>사유</Text>
                        <TextInput
                            style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]}
                            value={adjustReason}
                            onChangeText={setAdjustReason}
                            multiline
                            placeholder="예: 야간 보너스 / 식대 가불 등"
                            placeholderTextColor={c.textTertiary}
                        />
                        <View style={styles.modalRow}>
                            <Pressable
                                onPress={() => setAdjustingIdx(null)}
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                            >
                                <Text style={styles.modalBtnCancelText}>취소</Text>
                            </Pressable>
                            <Pressable
                                onPress={commitAdjust}
                                style={[styles.modalBtn, styles.modalBtnConfirm]}
                            >
                                <Text style={styles.modalBtnConfirmText}>적용</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const ConfirmBlock: React.FC<any> = ({startDate, endDate, previews, totalNet}) => {
    const styles = useStyles();
    return (
        <View style={fieldStyles.gap}>
            <HeroNumber label="발급 총액" value={won(totalNet)} sub={`직원 ${previews.length}명`} accent />
            <AppCard variant="warm" style={styles.confirmCard}>
                <KV label="기간" value={`${startDate} ~ ${endDate}`} />
                <KV label="직원" value={`${previews.length}명`} />
                <KV label="총액" value={won(totalNet)} highlight />
            </AppCard>
            <AppText variant="caption" tone="tertiary" style={styles.confirmNote}>
                발급 후 24시간 이내 취소할 수 있어요.
            </AppText>
        </View>
    );
};

const DoneBlock: React.FC<{totalNet: number; count: number}> = ({totalNet, count}) => {
    const styles = useStyles();
    return (
        <View style={styles.doneBox}>
            <HeroNumber
                label="명세서 발급이 끝났어요"
                value={won(totalNet)}
                sub={`직원 ${count}명에게 알림을 보냈어요`}
                accent
                center
            />
            <AppText variant="bodyMd" tone="secondary" center style={styles.doneCopy}>
                사장님, 이번 정산이 모두 끝났어요.
            </AppText>
        </View>
    );
};

const KV: React.FC<{label: string; value: string; highlight?: boolean}> = ({
    label,
    value,
    highlight,
}) => {
    const styles = useStyles();
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{label}</Text>
            <Text style={[styles.kvValue, highlight && styles.kvValueHighlight]}>{value}</Text>
        </View>
    );
};

function getDefaultStart(): string {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}01`;
}
function getDefaultEnd(): string {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(last)}`;
}
function pad(n: number): string {
    return String(n).padStart(2, '0');
}

const fieldStyles = StyleSheet.create({
    gap: {gap: tokens.spacing.lg},
});

// 다크모드 대응: 모든 색상 토큰을 c(현재 테마 팔레트)로부터 받아 styles 를 매번 만들어 준다.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
    selectorBlock: {gap: tokens.spacing.sm},
    selectorLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
        fontWeight: tokens.typography.weights.semibold,
    },
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm},
    chip: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.lg,
        borderWidth: 1.5,
        maxWidth: 220,
    },
    chipText: {fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold},

    emptyPad: {paddingVertical: tokens.spacing.xl},

    warnCard: {gap: tokens.spacing.xs, marginBottom: tokens.spacing.lg},
    warnHeader: {flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm},
    warnTitle: {flexShrink: 1},
    warnBody: {marginTop: tokens.spacing.xs, lineHeight: 18},
    warnRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.spacing.sm, paddingVertical: 2},
    warnEmp: {flexShrink: 1},
    warnHours: {fontVariant: ['tabular-nums' as const], textAlign: 'right' as const},
    warnDisclaimer: {marginTop: tokens.spacing.sm, lineHeight: 16},

    empCard: {gap: 2},
    empHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.sm, gap: tokens.spacing.sm},
    empName: {flexShrink: 1},
    empDivider: {height: 1, marginVertical: tokens.spacing.xs},
    adjustBtn: {marginTop: tokens.spacing.sm, alignSelf: 'flex-start'},

    kvRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: tokens.spacing.md},
    kvLabel: {color: c.textSecondary, fontSize: tokens.typography.sizes.sm},
    kvValue: {color: c.textPrimary, fontSize: tokens.typography.sizes.sm, fontWeight: '500' as const, fontVariant: ['tabular-nums' as const], flexShrink: 1, textAlign: 'right' as const},
    kvValueHighlight: {
        color: c.brandPrimary,
        fontWeight: '700' as const,
        fontSize: tokens.typography.sizes.md,
    },

    confirmCard: {gap: tokens.spacing.xs},
    confirmNote: {textAlign: 'center' as const, lineHeight: 18},

    doneBox: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.md},
    doneCopy: {maxWidth: 280},

    modalBackdrop: {flex: 1, backgroundColor: c.overlayDark, justifyContent: 'flex-end'},
    modalSheet: {
        backgroundColor: c.background,
        borderTopLeftRadius: tokens.radius.xxl,
        borderTopRightRadius: tokens.radius.xxl,
        padding: tokens.spacing.xl,
        paddingBottom: tokens.spacing.huge,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.border,
        alignSelf: 'center',
        marginBottom: tokens.spacing.md,
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        marginBottom: tokens.spacing.md,
    },
    modalLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.xs,
        fontWeight: tokens.typography.weights.semibold,
    },
    modalInput: {
        borderWidth: 1.5,
        borderColor: c.border,
        borderRadius: tokens.radius.lg,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        fontSize: tokens.typography.sizes.md,
        color: c.textPrimary,
        backgroundColor: c.surface,
    },
    modalRow: {flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.lg},
    modalBtn: {flex: 1, paddingVertical: tokens.spacing.md, borderRadius: tokens.radius.lg, alignItems: 'center'},
    modalBtnCancel: {backgroundColor: c.surfaceMuted},
    modalBtnCancelText: {color: c.textSecondary, fontWeight: tokens.typography.weights.semibold},
    modalBtnConfirm: {backgroundColor: c.brandPrimary},
    modalBtnConfirmText: {color: c.textInverse, fontWeight: tokens.typography.weights.bold},
});

/** 컴포넌트 본문에서 styles 를 한 줄로 가져오는 헬퍼 */
const useStyles = () => {
    const c = useThemeColors();
    return useMemo(() => makeStyles(c), [c]);
};

export default PayrollRunScreen;
