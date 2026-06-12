/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, AppBadge, AppButton, AppCard, AppHeader, AppInput, Brandmark, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import api from '../../../common/utils/api';
import storeService, {StoreSummaryDto} from '../../store/services/storeService';

// 정산 계산 로직 보존을 위한 경량 어댑터 (구식 Button/Card/Badge/Input → DS)
const Button: React.FC<any> = ({title, size, fullWidth: _fullWidth, ...rest}) => (
    <AppButton label={title} size={size === 'sm' ? 'sm' : 'lg'} {...rest} />
);
const Card: React.FC<any> = ({children, style}) => (
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
    const r = useResponsive();
    // 3 단계 정산 마법사 — compact(<360) 에서는 단계마다 카드/CTA 가 한 화면에 안 들어와 스크롤이 길어진다.
    // 본문 padding·서브타이틀 marginBottom·총액카드 padding·CTA marginTop 만 한 단계씩 축소해 fold-above 정보량 확보.
    const contentPad = r.pick({compact: tokens.spacing.md, default: tokens.spacing.lg});
    const subtitleMargin = r.pick({compact: tokens.spacing.md, default: tokens.spacing.xl});
    const totalCardPad = r.pick({compact: tokens.spacing.lg, default: tokens.spacing.xl});
    const ctaMargin = r.pick({compact: tokens.spacing.lg, default: tokens.spacing.xxl});
    const storeIdParam = route.params?.storeId as number | undefined;
    const {user} = useAuth();

    const [step, setStep] = useState<Step>('PERIOD');
    const [storeId, setStoreId] = useState<number | null>(storeIdParam ?? null);
    const [stores, setStores] = useState<StoreSummaryDto[]>([]);
    const [startDate, setStartDate] = useState(getDefaultStart());
    const [endDate, setEndDate] = useState(getDefaultEnd());
    const [previews, setPreviews] = useState<PayrollPreview[]>([]);
    const [loading, setLoading] = useState(false);

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
            AppToast.error(e?.response?.data?.message ?? '급여 계산 중 오류가 났어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    const goConfirm = () => setStep('CONFIRM');

    const issuePayrolls = async () => {
        setLoading(true);
        // BE /issue 가 확정→지급완료를 원자 처리(DRAFT→PAID 직접 전이 400 방지).
        // 항목별 성공/실패를 집계해 부분 발급 상황을 사장에게 정확히 알린다.
        const issuable = previews.filter(p => p.payrollId);
        let success = 0;
        const failed: string[] = [];
        for (const p of issuable) {
            try {
                await api.put(`/api/payroll/${p.payrollId}/issue`);
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

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="급여 정산" onBack={() => navigation.goBack()} />}>
            <Stepper step={step} compact={r.isCompact} />
            <View style={{paddingHorizontal: contentPad - tokens.spacing.lg}}>
                {step === 'PERIOD' && (
                    <PeriodForm
                        storeId={storeId}
                        setStoreId={setStoreId}
                        stores={stores}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        onNext={goPreview}
                        loading={loading}
                        subtitleMargin={subtitleMargin}
                        ctaMargin={ctaMargin}
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
                        totalCardPad={totalCardPad}
                        ctaMargin={ctaMargin}
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
                        ctaMargin={ctaMargin}
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

const Stepper: React.FC<{step: Step; compact?: boolean}> = ({step, compact}) => {
    const styles = useStyles();
    const idx = step === 'PERIOD' ? 0 : step === 'PREVIEW' ? 1 : step === 'CONFIRM' ? 2 : 3;
    const labels = ['기간', '미리보기', '확인'];
    return (
        <View style={[styles.stepper, compact && {paddingVertical: tokens.spacing.sm}]}>
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
    onNext,
    loading,
    subtitleMargin,
    ctaMargin,
}) => {
    const styles = useStyles();
    const storeList: StoreSummaryDto[] = stores ?? [];
    return (
    <View>
        <Text style={styles.title}>1단계: 기간 설정</Text>
        {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
        <Text style={[styles.subtitle, subtitleMargin != null && {marginBottom: subtitleMargin}]}>
            정산할 매장과 기간을 선택해 주세요.{'\n'}기본은 이번 달 1일~말일이에요.
        </Text>

        <StoreSelector stores={storeList} storeId={storeId} setStoreId={setStoreId} />
        <Input label="시작일 (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
        <Input label="종료일 (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />

        <Button
            title="다음: 미리보기"
            onPress={onNext}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
            style={[styles.cta, ctaMargin != null && {marginTop: ctaMargin}]}
        />
    </View>
    );
};

const PreviewList: React.FC<any> = ({previews, totalNet, onAdjust, onNext, totalCardPad, ctaMargin}) => {
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
    <View>
        <Text style={styles.title}>2단계: 미리보기</Text>
        {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
        <Card bordered style={[styles.totalCard, totalCardPad != null && {paddingVertical: totalCardPad}]}>
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
            // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
            style={[styles.cta, ctaMargin != null && {marginTop: ctaMargin}]}
        />

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

const ConfirmCard: React.FC<any> = ({startDate, endDate, previews, totalNet, loading, onIssue, ctaMargin}) => {
    const styles = useStyles();
    const c = useThemeColors();
    return (
    <View>
        <Text style={styles.title}>3단계: 확인</Text>
        <Card bordered style={styles.confirmCard}>
            <View style={{marginBottom: tokens.spacing.md}}>
                <Brandmark size={56} label="✓" backgroundColor={c.success} />
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
            // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
            style={[styles.cta, ctaMargin != null && {marginTop: ctaMargin}]}
        />
    </View>
    );
};

const DoneCard: React.FC<any> = ({totalNet, onClose}) => {
    const styles = useStyles();
    return (
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

// 다크모드 대응: 모든 색상 토큰을 c(현재 테마 팔레트)로부터 받아 styles 를 매번 만들어 준다.
// 각 sub-component 가 자체적으로 useThemeColors + useMemo(makeStyles(c)) 로 인스턴스를 가진다.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
        backgroundColor: c.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {backgroundColor: c.brandPrimary},
    stepDotDone: {backgroundColor: c.success},
    stepText: {color: c.textInverse, fontWeight: '700' as const},
    stepLine: {flex: 1, height: 2, backgroundColor: c.surfaceMuted, maxWidth: 60},
    stepLineDone: {backgroundColor: c.success},

    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        marginBottom: tokens.spacing.sm,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: c.textSecondary,
        marginBottom: tokens.spacing.xl,
        lineHeight: 22,
    },

    totalCard: {alignItems: 'center', paddingVertical: tokens.spacing.xl},
    totalLabel: {fontSize: tokens.typography.sizes.sm, color: c.textSecondary},
    totalAmount: {
        fontSize: tokens.typography.scale.numericLg.fontSize,
        lineHeight: tokens.typography.scale.numericLg.lineHeight,
        fontWeight: tokens.typography.weights.bold,
        color: c.brandPrimary,
        marginVertical: tokens.spacing.xs,
        letterSpacing: -1,
    },
    totalSub: {fontSize: tokens.typography.sizes.xs, color: c.textTertiary},

    empty: {textAlign: 'center' as const, padding: tokens.spacing.xl, color: c.textTertiary},

    selectorBlock: {marginBottom: tokens.spacing.md},
    selectorLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
        fontWeight: tokens.typography.weights.semibold,
        marginBottom: tokens.spacing.sm,
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

    empCard: {marginVertical: tokens.spacing.sm},
    empHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.sm},
    empName: {fontSize: tokens.typography.sizes.lg, fontWeight: '700' as const, color: c.textPrimary},
    empDivider: {
        height: 1,
        backgroundColor: c.divider,
        marginVertical: tokens.spacing.xs,
    },

    kvRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
    kvLabel: {color: c.textSecondary, fontSize: tokens.typography.sizes.sm},
    kvValue: {color: c.textPrimary, fontSize: tokens.typography.sizes.sm, fontWeight: '500' as const, fontVariant: ['tabular-nums' as const]},
    kvValueHighlight: {
        color: c.brandPrimary,
        fontWeight: '700' as const,
        fontSize: tokens.typography.sizes.md,
    },

    confirmCard: {alignItems: 'center', paddingVertical: tokens.spacing.xxl},
    confirmTitle: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: '700' as const,
        color: c.success,
        marginBottom: tokens.spacing.md,
    },
    confirmNote: {
        textAlign: 'center' as const,
        color: c.textTertiary,
        fontSize: tokens.typography.sizes.xs,
        marginVertical: tokens.spacing.lg,
        lineHeight: 18,
    },

    doneBox: {alignItems: 'center', paddingTop: tokens.spacing.huge},

    cta: {marginTop: tokens.spacing.xxl},

    modalBackdrop: {flex: 1, backgroundColor: c.overlayDark, justifyContent: 'flex-end'},
    modalSheet: {
        backgroundColor: c.background,
        borderTopLeftRadius: tokens.radius.xl,
        borderTopRightRadius: tokens.radius.xl,
        padding: tokens.spacing.lg,
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
