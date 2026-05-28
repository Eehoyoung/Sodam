import React, {useState} from 'react';
import {Alert, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    Brandmark,
    ScreenContainer,
} from '../../../common/components/ds';
import api from '../../../common/utils/api';

// 정산 계산 로직 보존을 위한 경량 어댑터 (구식 Button/Card/Badge/Input → DS)
const Button: React.FC<any> = ({title, size, fullWidth, ...rest}) => (
    <AppButton label={title} size={size === 'sm' ? 'sm' : 'lg'} {...rest} />
);
const Card: React.FC<any> = ({bordered, children, style}) => (
    <AppCard variant="flat" style={style}>{children}</AppCard>
);
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
    grossWage: number;
    taxAmount: number;
    netWage: number;
    adjustment?: number;
    adjustmentReason?: string;
}

/**
 * 사장 정산 플로우 (PRD_OWNER S-301).
 *
 * 3 단계:
 *   1) PERIOD  — 매장·기간 선택
 *   2) PREVIEW — 직원별 자동 계산 결과 확인 + 가감 조정
 *   3) CONFIRM — 명세서 발급 + 직원 푸시
 *
 * BE 가 미리보기/발급 API 를 모두 동일 엔드포인트로 처리한다는 가정 하에 작성.
 *   - POST /api/payroll/calculate   (storeId, startDate, endDate) → 직원별 미리보기
 *   - PUT  /api/payroll/{id}/status?status=PAID (발급 확정)
 *
 * TODO[P1 BE]: 개별 가감 (adjustment) 엔드포인트:
 *   - POST /api/payroll/{id}/adjustment {amount, reason}
 *   현재 화면은 로컬 state 만 보관, BE 호출은 stub.
 */
const PayrollRunScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const storeIdParam = route.params?.storeId as number | undefined;

    const [step, setStep] = useState<Step>('PERIOD');
    const [storeId, setStoreId] = useState<number | null>(storeIdParam ?? null);
    const [startDate, setStartDate] = useState(getDefaultStart());
    const [endDate, setEndDate] = useState(getDefaultEnd());
    const [previews, setPreviews] = useState<PayrollPreview[]>([]);
    const [loading, setLoading] = useState(false);

    const totalNet = previews.reduce((s, p) => s + (p.netWage ?? 0) + (p.adjustment ?? 0), 0);

    const goPreview = async () => {
        if (!storeId) {
            Alert.alert('확인 필요', '매장을 선택해 주세요.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post<any[]>('/api/payroll/calculate', {
                storeId,
                startDate,
                endDate,
            });
            const data: any[] = res.data ?? [];
            setPreviews(
                data.map(d => ({
                    payrollId: d.id,
                    employeeId: d.employee?.id ?? d.employeeId,
                    employeeName: d.employee?.user?.name ?? d.employeeName ?? '직원',
                    regularHours: d.regularHours ?? 0,
                    regularWage: d.regularWage ?? 0,
                    overtimeHours: d.overtimeHours ?? 0,
                    overtimeWage: d.overtimeWage ?? 0,
                    nightWorkHours: d.nightWorkHours ?? 0,
                    nightWorkWage: d.nightWorkWage ?? 0,
                    weeklyAllowance: d.weeklyAllowance ?? 0,
                    grossWage: d.grossWage ?? 0,
                    taxAmount: d.taxAmount ?? 0,
                    netWage: d.netWage ?? 0,
                })),
            );
            setStep('PREVIEW');
        } catch (e: any) {
            Alert.alert(
                '계산 실패',
                e?.response?.data?.message ?? '급여 계산 중 오류가 났어요. 잠시 후 다시 시도해 주세요.',
            );
        } finally {
            setLoading(false);
        }
    };

    const goConfirm = () => setStep('CONFIRM');

    const issuePayrolls = async () => {
        setLoading(true);
        try {
            for (const p of previews) {
                if (p.payrollId) {
                    await api.put(`/api/payroll/${p.payrollId}/status?status=PAID`);
                }
            }
            setStep('DONE');
        } catch (e: any) {
            Alert.alert(
                '발급 실패',
                '일부 명세서 발급에 실패했어요. 잠시 후 다시 시도해 주세요.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="급여 정산" onBack={() => navigation.goBack()} />}>
            <Stepper step={step} />
            <View>
                {step === 'PERIOD' && (
                    <PeriodForm
                        storeId={storeId}
                        setStoreId={setStoreId}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        onNext={goPreview}
                        loading={loading}
                    />
                )}

                {step === 'PREVIEW' && (
                    <PreviewList
                        previews={previews}
                        totalNet={totalNet}
                        onAdjust={(idx: number, amount: number, reason: string) => {
                            const next = [...previews];
                            next[idx] = {...next[idx], adjustment: amount, adjustmentReason: reason};
                            setPreviews(next);
                        }}
                        onNext={goConfirm}
                    />
                )}

                {step === 'CONFIRM' && (
                    <ConfirmCard
                        startDate={startDate}
                        endDate={endDate}
                        previews={previews}
                        totalNet={totalNet}
                        loading={loading}
                        onIssue={issuePayrolls}
                    />
                )}

                {step === 'DONE' && (
                    <DoneCard
                        totalNet={totalNet}
                        onClose={() => navigation.goBack()}
                    />
                )}
            </View>
        </ScreenContainer>
    );
};

const Stepper: React.FC<{step: Step}> = ({step}) => {
    const idx = step === 'PERIOD' ? 0 : step === 'PREVIEW' ? 1 : step === 'CONFIRM' ? 2 : 3;
    const labels = ['기간', '미리보기', '확인'];
    return (
        <View style={styles.stepper}>
            {labels.map((label, i) => (
                <React.Fragment key={label}>
                    <View
                        style={[
                            styles.stepDot,
                            i < idx && styles.stepDotDone,
                            i === idx && styles.stepDotActive,
                        ]}
                    >
                        <Text style={styles.stepText}>{i + 1}</Text>
                    </View>
                    {i < labels.length - 1 && (
                        <View style={[styles.stepLine, i < idx && styles.stepLineDone]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};

const PeriodForm: React.FC<any> = ({
    storeId,
    setStoreId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onNext,
    loading,
}) => (
    <View>
        <Text style={styles.title}>1단계: 기간 설정</Text>
        <Text style={styles.subtitle}>
            정산할 매장과 기간을 선택해 주세요.{'\n'}기본은 이번 달 1일~말일이에요.
        </Text>

        <Input
            label="매장 ID (1매장 사용 시 기본값)"
            value={storeId ? String(storeId) : ''}
            onChangeText={(v: string) => setStoreId(parseInt(v, 10) || null)}
            keyboardType="number-pad"
            placeholder="예: 1"
        />
        <Input label="시작일 (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
        <Input label="종료일 (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />

        <Button
            title="다음: 미리보기"
            onPress={onNext}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={styles.cta}
        />
    </View>
);

const PreviewList: React.FC<any> = ({previews, totalNet, onAdjust, onNext}) => {
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
        if (adjustingIdx == null) return;
        const num = parseInt((adjustAmount || '0').replace(/[^0-9-]/g, ''), 10) || 0;
        const reason = adjustReason.trim();
        if (num !== 0 && reason.length < 2) {
            Alert.alert('확인 필요', '사유를 2자 이상 입력해 주세요.');
            return;
        }
        onAdjust(adjustingIdx, num, reason);
        setAdjustingIdx(null);
        setAdjustAmount('');
        setAdjustReason('');
    };

    return (
    <View>
        <Text style={styles.title}>2단계: 미리보기</Text>
        <Card bordered style={styles.totalCard}>
            <Text style={styles.totalLabel}>총 지급 예정</Text>
            <Text style={styles.totalAmount}>₩{totalNet.toLocaleString('ko-KR')}</Text>
            <Text style={styles.totalSub}>{previews.length}명 직원</Text>
        </Card>

        {previews.length === 0 ? (
            <Text style={styles.empty}>이 기간에 정산할 출퇴근 기록이 없어요.</Text>
        ) : (
            previews.map((p: PayrollPreview, idx: number) => (
                <Card key={idx} bordered style={styles.empCard}>
                    <View style={styles.empHeader}>
                        <Text style={styles.empName}>{p.employeeName}</Text>
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
                    <View style={styles.empDivider} />
                    <KV label="세전" value={`${p.grossWage.toLocaleString('ko-KR')}원`} />
                    <KV label="세금 (3.3%)" value={`-${p.taxAmount.toLocaleString('ko-KR')}원`} />
                    <KV label="실수령" value={`${(p.netWage + (p.adjustment ?? 0)).toLocaleString('ko-KR')}원`} highlight />
                    <Button
                        title={p.adjustment ? '가감 수정' : '+ 가감 추가'}
                        onPress={() => openAdjust(idx)}
                        variant="ghost"
                        size="sm"
                    />
                </Card>
            ))
        )}

        <Button
            title="다음: 명세서 발급"
            onPress={onNext}
            variant="primary"
            size="lg"
            fullWidth
            disabled={previews.length === 0}
            style={styles.cta}
        />

        <Modal
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
                        placeholderTextColor={tokens.colors.textTertiary}
                    />
                    <Text style={styles.modalLabel}>사유</Text>
                    <TextInput
                        style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]}
                        value={adjustReason}
                        onChangeText={setAdjustReason}
                        multiline
                        placeholder="예: 야간 보너스 / 식대 가불 등"
                        placeholderTextColor={tokens.colors.textTertiary}
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

const ConfirmCard: React.FC<any> = ({startDate, endDate, previews, totalNet, loading, onIssue}) => (
    <View>
        <Text style={styles.title}>3단계: 확인</Text>
        <Card bordered style={styles.confirmCard}>
            <View style={{marginBottom: tokens.spacing.md}}>
                <Brandmark size={56} label="✓" backgroundColor={tokens.colors.success} />
            </View>
            <Text style={styles.confirmTitle}>정산 준비 완료</Text>
            <KV label="기간" value={`${startDate} ~ ${endDate}`} />
            <KV label="직원" value={`${previews.length}명`} />
            <KV label="총액" value={`₩${totalNet.toLocaleString('ko-KR')}`} highlight />
        </Card>

        <Text style={styles.confirmNote}>
            발급하면 직원 앱에 자동으로 명세서 알림이 전송돼요.{'\n'}
            발급 후 24시간 이내 취소할 수 있어요.
        </Text>

        <Button
            title="명세서 발급하기"
            onPress={onIssue}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={styles.cta}
        />
    </View>
);

const DoneCard: React.FC<any> = ({totalNet, onClose}) => (
    <View style={styles.doneBox}>
        <View style={{marginBottom: tokens.spacing.lg}}>
            <Brandmark size={72} label="₩" />
        </View>
        <Text style={styles.title}>명세서 발급이 끝났어요</Text>
        <Text style={styles.subtitle}>
            총 ₩{totalNet.toLocaleString('ko-KR')} 정산.{'\n'}직원분들께 알림이 전송됐어요.
        </Text>
        <Button title="홈으로 돌아가기" onPress={onClose} variant="primary" size="lg" fullWidth />
    </View>
);

const KV: React.FC<{label: string; value: string; highlight?: boolean}> = ({
    label,
    value,
    highlight,
}) => (
    <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>{label}</Text>
        <Text style={[styles.kvValue, highlight && styles.kvValueHighlight]}>{value}</Text>
    </View>
);

function getDefaultStart(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function getDefaultEnd(): string {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}`;
}
function pad(n: number): string {
    return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: tokens.spacing.md,
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: tokens.colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {backgroundColor: tokens.colors.brandPrimary},
    stepDotDone: {backgroundColor: tokens.colors.success},
    stepText: {color: tokens.colors.textInverse, fontWeight: '700'},
    stepLine: {flex: 1, height: 2, backgroundColor: tokens.colors.surfaceMuted, maxWidth: 60},
    stepLineDone: {backgroundColor: tokens.colors.success},

    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginBottom: tokens.spacing.sm,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        marginBottom: tokens.spacing.xl,
        lineHeight: 22,
    },

    totalCard: {alignItems: 'center', paddingVertical: tokens.spacing.xl},
    totalLabel: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary},
    totalAmount: {
        fontSize: 36,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.brandPrimary,
        marginVertical: tokens.spacing.xs,
        letterSpacing: -1,
    },
    totalSub: {fontSize: tokens.typography.sizes.xs, color: tokens.colors.textTertiary},

    empty: {textAlign: 'center', padding: tokens.spacing.xl, color: tokens.colors.textTertiary},

    empCard: {marginVertical: tokens.spacing.sm},
    empHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.sm},
    empName: {fontSize: tokens.typography.sizes.lg, fontWeight: '700', color: tokens.colors.textPrimary},
    empDivider: {
        height: 1,
        backgroundColor: tokens.colors.divider,
        marginVertical: tokens.spacing.xs,
    },

    kvRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
    kvLabel: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm},
    kvValue: {color: tokens.colors.textPrimary, fontSize: tokens.typography.sizes.sm, fontWeight: '500', fontVariant: ['tabular-nums']},
    kvValueHighlight: {
        color: tokens.colors.brandPrimary,
        fontWeight: '700',
        fontSize: tokens.typography.sizes.md,
    },

    confirmCard: {alignItems: 'center', paddingVertical: tokens.spacing.xxl},
    confirmEmoji: {fontSize: 56, marginBottom: tokens.spacing.md},
    confirmTitle: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: '700',
        color: tokens.colors.success,
        marginBottom: tokens.spacing.md,
    },
    confirmNote: {
        textAlign: 'center',
        color: tokens.colors.textTertiary,
        fontSize: tokens.typography.sizes.xs,
        marginVertical: tokens.spacing.lg,
        lineHeight: 18,
    },

    doneBox: {alignItems: 'center', paddingTop: tokens.spacing.huge},
    doneEmoji: {fontSize: 72, marginBottom: tokens.spacing.lg},

    cta: {marginTop: tokens.spacing.xxl},

    modalBackdrop: {flex: 1, backgroundColor: tokens.colors.overlayDark, justifyContent: 'flex-end'},
    modalSheet: {
        backgroundColor: tokens.colors.background,
        borderTopLeftRadius: tokens.radius.xl,
        borderTopRightRadius: tokens.radius.xl,
        padding: tokens.spacing.lg,
        paddingBottom: tokens.spacing.huge,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: tokens.colors.border,
        alignSelf: 'center',
        marginBottom: tokens.spacing.md,
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginBottom: tokens.spacing.md,
    },
    modalLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textSecondary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.xs,
        fontWeight: tokens.typography.weights.semibold,
    },
    modalInput: {
        borderWidth: 1.5,
        borderColor: tokens.colors.border,
        borderRadius: tokens.radius.lg,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textPrimary,
        backgroundColor: tokens.colors.surface,
    },
    modalRow: {flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.lg},
    modalBtn: {flex: 1, paddingVertical: tokens.spacing.md, borderRadius: tokens.radius.lg, alignItems: 'center'},
    modalBtnCancel: {backgroundColor: tokens.colors.surfaceMuted},
    modalBtnCancelText: {color: tokens.colors.textSecondary, fontWeight: tokens.typography.weights.semibold},
    modalBtnConfirm: {backgroundColor: tokens.colors.brandPrimary},
    modalBtnConfirmText: {color: tokens.colors.textInverse, fontWeight: tokens.typography.weights.bold},
});

export default PayrollRunScreen;
