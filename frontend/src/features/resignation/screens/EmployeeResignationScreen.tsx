import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import resignationService from '../services/resignationService';
import {ResignationDateProposal, ResignationRequest} from '../types';
import {getErrorMessage} from '../../../common/errors';
import {
    DATE_DIGITS_HELPER,
    dateDigitsToIso,
    isValidDateDigits,
    sanitizeDateDigits,
} from '../../../common/utils/dateTimeInput';

const elapsedDays = (iso: string): number => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
};

/**
 * 직원용 사직서 제출·상태 화면(260817 퇴사 처리 기능 계획서 WP-5).
 * 대기 중(PENDING)이면 협의(제안/동의) UI를, 확인 완료(ACKNOWLEDGED)면 안내를 보여준다.
 */
const EmployeeResignationScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'Resignation'>>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [request, setRequest] = useState<ResignationRequest | null>(null);
    const [proposals, setProposals] = useState<ResignationDateProposal[]>([]);

    const [dateDigits, setDateDigits] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [counterDigits, setCounterDigits] = useState('');
    const [showCounterInput, setShowCounterInput] = useState(false);
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const mine = await resignationService.myRequests();
            const active = mine.find(r => r.storeId === storeId && r.status !== 'WITHDRAWN');
            setRequest(active ?? null);
            if (active && active.status === 'PENDING') {
                setProposals(await resignationService.proposals(storeId, active.id));
            } else {
                setProposals([]);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const handleSubmit = async () => {
        if (!isValidDateDigits(dateDigits)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        setSubmitting(true);
        try {
            await resignationService.submit(storeId, dateDigitsToIso(dateDigits), reason.trim() || undefined);
            AppToast.success('사직서를 제출했어요.');
            await load();
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '제출하지 못했어요. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async () => {
        if (!request) {return;}
        setActing(true);
        try {
            await resignationService.withdraw(storeId, request.id);
            AppToast.success('철회했어요.');
            await load();
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '철회하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    const handleAgree = async () => {
        if (!request) {return;}
        setActing(true);
        try {
            await resignationService.agree(storeId, request.id);
            AppToast.success('퇴사일에 합의했어요.');
            await load();
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '처리하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    const handleCounterPropose = async () => {
        if (!request) {return;}
        if (!isValidDateDigits(counterDigits)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        setActing(true);
        try {
            await resignationService.counterPropose(storeId, request.id, dateDigitsToIso(counterDigits));
            AppToast.success('새 날짜를 제안했어요.');
            setShowCounterInput(false);
            setCounterDigits('');
            await load();
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '처리하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    if (loading) {
        return (
            <ScreenContainer header={<AppHeader title="퇴사 신청" onBack={() => navigation.goBack()} />}>
                <LoadingState />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={<AppHeader title="퇴사 신청" onBack={() => navigation.goBack()} />}>
                <ErrorState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    if (request && request.status === 'ACKNOWLEDGED') {
        return (
            <ScreenContainer header={<AppHeader title="퇴사 신청" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    markColor={c.successBg}
                    title="사장님이 확인했어요"
                    description={`합의된 마지막 근무일: ${request.agreedResignationDate ?? '-'}\n실제 퇴사 처리는 사장님이 별도로 진행해요.`}
                    primary={{label: '닫기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    if (request && request.status === 'PENDING') {
        const lastProposal = proposals.length > 0 ? proposals[proposals.length - 1] : null;
        const waitingForMe = lastProposal?.proposerRole === 'MASTER';

        return (
            <ScreenContainer scroll header={<AppHeader title="퇴사 신청" onBack={() => navigation.goBack()} />}>
                <AppCard variant="warm" testID="resignation-status-card">
                    <AppText variant="titleMd">사직 신청 진행 중</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.sub}>
                        제출 후 {elapsedDays(request.requestedAt)}일 경과
                    </AppText>
                </AppCard>

                {waitingForMe && lastProposal ? (
                    <AppCard variant="plain" style={styles.proposalCard} testID="resignation-proposal-card">
                        <AppText variant="caption" tone="secondary">
                            사장님이 {new Date(lastProposal.proposedAt).toLocaleDateString('ko-KR')}에 제안했어요
                        </AppText>
                        <AppText variant="bodyMd" style={styles.proposalDate}>
                            제안된 날짜: {lastProposal.proposedDate}
                        </AppText>
                        {showCounterInput ? (
                            <View style={styles.counterRow}>
                                <AppInput
                                    testID="resignation-counter-date-input"
                                    label="다른 날짜 제안"
                                    value={counterDigits}
                                    onChangeText={v => setCounterDigits(sanitizeDateDigits(v))}
                                    placeholder="20260901"
                                    keyboardType="number-pad"
                                    maxLength={8}
                                    helper={DATE_DIGITS_HELPER}
                                />
                                <AppButton
                                    label="이 날짜로 제안하기"
                                    variant="secondary"
                                    size="sm"
                                    loading={acting}
                                    onPress={handleCounterPropose}
                                    testID="resignation-counter-submit-button"
                                />
                            </View>
                        ) : (
                            <View style={styles.proposalActions}>
                                <AppButton
                                    label="다른 날짜 제안"
                                    variant="ghost"
                                    size="sm"
                                    fullWidth={false}
                                    onPress={() => setShowCounterInput(true)}
                                    testID="resignation-counter-propose-button"
                                />
                                <AppButton
                                    label="이 날짜에 동의"
                                    variant="secondary"
                                    size="sm"
                                    fullWidth={false}
                                    loading={acting}
                                    onPress={handleAgree}
                                    testID="resignation-agree-button"
                                />
                            </View>
                        )}
                    </AppCard>
                ) : (
                    <AppText variant="bodyMd" tone="secondary" style={styles.waiting}>
                        사장님의 확인을 기다리고 있어요.
                    </AppText>
                )}

                <AppButton
                    label="사직 신청 철회"
                    variant="destructive"
                    loading={acting}
                    onPress={handleWithdraw}
                    style={styles.withdrawButton}
                    testID="resignation-withdraw-button"
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="퇴사 신청" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton label="사직 신청 보내기" loading={submitting} onPress={handleSubmit} testID="resignation-submit-button" />
            }>
            <AppText variant="headingLg" style={styles.question}>퇴사를 신청할까요?</AppText>
            <View style={styles.form}>
                <AppInput
                    testID="resignation-date-input"
                    label="희망 퇴사일"
                    value={dateDigits}
                    onChangeText={v => setDateDigits(sanitizeDateDigits(v))}
                    placeholder="20260901"
                    keyboardType="number-pad"
                    maxLength={8}
                    helper={DATE_DIGITS_HELPER}
                    editable={!submitting}
                />
                <AppInput
                    testID="resignation-reason-input"
                    label="사유(선택)"
                    value={reason}
                    onChangeText={v => setReason(v.slice(0, 200))}
                    placeholder="예: 개인 사정으로 퇴사합니다"
                    multiline
                    editable={!submitting}
                    maxLength={200}
                    helper={`${reason.length} / 200자`}
                />
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                사장님이 확인해도 즉시 퇴사 처리되지 않아요 — 실제 처리는 합의된 날짜에 별도로 진행돼요.
            </AppText>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    question: {marginBottom: spacing.xl},
    form: {marginTop: spacing.xl, gap: spacing.lg},
    disclaimer: {marginTop: spacing.xl, textAlign: 'center'},
    sub: {marginTop: 4},
    proposalCard: {marginTop: spacing.lg, gap: spacing.sm},
    proposalDate: {fontWeight: '700'},
    proposalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm},
    counterRow: {gap: spacing.sm, marginTop: spacing.sm},
    waiting: {marginTop: spacing.lg, textAlign: 'center'},
    withdrawButton: {marginTop: spacing.xxl},
});

export default EmployeeResignationScreen;
