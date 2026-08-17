import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import resignationService from '../services/resignationService';
import {ResignationDateProposal, ResignationRequest} from '../types';
import {getErrorMessage} from '../../../common/errors';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';

const elapsedDays = (iso: string): number => {
    const then = new Date(iso).getTime();
    return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
};

const STATUS_LABEL: Record<ResignationRequest['status'], string> = {
    PENDING: '협의 중',
    WITHDRAWN: '철회됨',
    ACKNOWLEDGED: '확인 완료',
};
const STATUS_TONE: Record<ResignationRequest['status'], 'warning' | 'neutral' | 'success'> = {
    PENDING: 'warning',
    WITHDRAWN: 'neutral',
    ACKNOWLEDGED: 'success',
};

/**
 * 사장용 사직서 목록·상세(260817 퇴사 처리 기능 계획서 WP-5). 확인(acknowledge)은 협의 확정
 * (agreedResignationDate) 후에만 가능 — 확인해도 즉시 비활성화되지 않는다(별도 화면에서 처리).
 */
const StoreResignationRequestsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<HomeStackParamList, 'StoreResignationRequests'>>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [requests, setRequests] = useState<ResignationRequest[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [proposals, setProposals] = useState<ResignationDateProposal[]>([]);
    const [counterDigits, setCounterDigits] = useState('');
    const [showCounterInput, setShowCounterInput] = useState(false);
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setRequests(await resignationService.listForStore(storeId));
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

    const toggleExpand = async (request: ResignationRequest) => {
        if (expandedId === request.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(request.id);
        setShowCounterInput(false);
        if (request.status === 'PENDING') {
            try {
                setProposals(await resignationService.proposals(storeId, request.id));
            } catch {
                setProposals([]);
            }
        }
    };

    const handleAgree = async (request: ResignationRequest) => {
        setActing(true);
        try {
            await resignationService.agree(storeId, request.id);
            AppToast.success('퇴사일에 합의했어요.');
            await load();
            setExpandedId(null);
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '처리하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    const handleCounterPropose = async (request: ResignationRequest) => {
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
            const refreshed = await resignationService.proposals(storeId, request.id);
            setProposals(refreshed);
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '처리하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    const handleAcknowledge = async (request: ResignationRequest) => {
        setActing(true);
        try {
            await resignationService.acknowledge(storeId, request.id);
            AppToast.success('확인했어요.');
            await load();
            setExpandedId(null);
        } catch (e: unknown) {
            AppToast.error(getErrorMessage(e, '확인하지 못했어요.'));
        } finally {
            setActing(false);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    if (loading) {
        return (
            <ScreenContainer header={<AppHeader title="퇴사 신청 관리" onBack={() => navigation.goBack()} />}>
                <LoadingState />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={<AppHeader title="퇴사 신청 관리" onBack={() => navigation.goBack()} />}>
                <ErrorState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={<AppHeader title="퇴사 신청 관리" onBack={() => navigation.goBack()} />}>
            {requests.length === 0 ? (
                <View testID="resignation-empty-state">
                    <EmptyState title="퇴사 신청이 없어요" description="직원이 사직을 신청하면 여기에 표시돼요." />
                </View>
            ) : (
                <>
                    {pendingCount > 0 ? (
                        <AppBadge
                            label={`퇴사 신청 대기 ${pendingCount}건`}
                            tone="warning"
                            testID="resignation-pending-badge"
                        />
                    ) : null}
                    <View style={styles.list}>
                        {requests.map(request => {
                            const lastProposal = proposals.length > 0 ? proposals[proposals.length - 1] : null;
                            const waitingForMaster = lastProposal?.proposerRole === 'EMPLOYEE';
                            const expanded = expandedId === request.id;
                            return (
                                <AppCard
                                    key={request.id}
                                    variant="flat"
                                    onPress={() => toggleExpand(request)}
                                    testID={`resignation-request-card-${request.id}`}>
                                    <View style={styles.cardTop}>
                                        <AppText variant="titleMd" style={styles.flex}>
                                            희망일 {request.desiredResignationDate}
                                        </AppText>
                                        <AppBadge label={STATUS_LABEL[request.status]} tone={STATUS_TONE[request.status]} />
                                    </View>
                                    {request.reason ? (
                                        <AppText variant="caption" tone="secondary" style={styles.reason}>
                                            {request.reason}
                                        </AppText>
                                    ) : null}

                                    {expanded && request.status === 'PENDING' ? (
                                        <View style={styles.detail}>
                                            {waitingForMaster && lastProposal ? (
                                                <View testID="resignation-master-proposal-actions">
                                                    <AppText variant="caption" tone="secondary">
                                                        직원이 제안한 날짜: {lastProposal.proposedDate}
                                                    </AppText>
                                                    {showCounterInput ? (
                                                        <View style={styles.counterRow}>
                                                            <AppInput
                                                                testID="resignation-master-counter-date-input"
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
                                                                onPress={() => handleCounterPropose(request)}
                                                                testID="resignation-master-counter-submit-button"
                                                            />
                                                        </View>
                                                    ) : (
                                                        <View style={styles.actionsRow}>
                                                            <AppButton
                                                                label="다른 날짜 제안"
                                                                variant="ghost"
                                                                size="sm"
                                                                fullWidth={false}
                                                                onPress={() => setShowCounterInput(true)}
                                                                testID="resignation-master-counter-propose-button"
                                                            />
                                                            <AppButton
                                                                label="이 날짜에 동의"
                                                                variant="secondary"
                                                                size="sm"
                                                                fullWidth={false}
                                                                loading={acting}
                                                                onPress={() => handleAgree(request)}
                                                                testID="resignation-master-agree-button"
                                                            />
                                                        </View>
                                                    )}
                                                </View>
                                            ) : (
                                                <AppText variant="caption" tone="tertiary" style={styles.waitingNote}>
                                                    직원 응답 대기 중 · 신청 후 {elapsedDays(request.requestedAt)}일 경과
                                                </AppText>
                                            )}

                                            {request.agreedResignationDate ? (
                                                <View style={styles.acknowledgeRow}>
                                                    <AppText variant="bodyMd" style={{color: c.brandPrimary}}>
                                                        합의된 날짜: {request.agreedResignationDate}
                                                    </AppText>
                                                    <AppButton
                                                        label="확인하기"
                                                        variant="primary"
                                                        size="sm"
                                                        loading={acting}
                                                        onPress={() => handleAcknowledge(request)}
                                                        testID="resignation-acknowledge-button"
                                                    />
                                                </View>
                                            ) : null}
                                        </View>
                                    ) : null}
                                </AppCard>
                            );
                        })}
                    </View>
                </>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.md, gap: spacing.sm},
    cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    reason: {marginTop: spacing.xs},
    detail: {marginTop: spacing.md, gap: spacing.sm},
    counterRow: {gap: spacing.sm, marginTop: spacing.sm},
    actionsRow: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm},
    waitingNote: {marginTop: spacing.xs},
    acknowledgeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm},
});

export default StoreResignationRequestsScreen;
