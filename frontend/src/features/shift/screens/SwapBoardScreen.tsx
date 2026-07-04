/**
 * SwapBoardScreen — 직원용 대타 지원 보드 (route: SwapBoard).
 *
 * 소속 매장의 OPEN 대타 모집을 보여주고, 직원이 [지원하기]로 본인 지원.
 * 여러 매장 소속이면 칩으로 매장 선택. 지원 완료 항목은 배지 표시.
 */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ConfirmSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useAuth} from '../../../contexts/AuthContext';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import storeService from '../../store/services/storeService';
import {shortTime} from '../services/shiftService';
import {applySwap, fetchOpenSwaps, SwapRequest} from '../services/swapBoardService';

interface MyStore {
    id: number;
    storeName: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → '7월 3일 (목)' */
function formatDateLabel(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) {
        return iso;
    }
    const date = new Date(y, m - 1, d);
    return `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`;
}

const SwapBoardScreen: React.FC = () => {
    const navigation = useNavigation();
    const {user} = useAuth();
    const c = useThemeColors();

    const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
    const [stores, setStores] = useState<MyStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [swaps, setSwaps] = useState<SwapRequest[]>([]);
    const [applyingId, setApplyingId] = useState<number | null>(null);
    // useFocusEffect 재실행 없이 현재 선택 매장을 읽기 위한 ref (chip 선택 시 이중 로드 방지)
    const selectedStoreIdRef = useRef<number | null>(null);

    const selectedStore = useMemo(
        () => stores.find(store => store.id === selectedStoreId) ?? stores[0] ?? null,
        [stores, selectedStoreId],
    );

    const loadSwaps = useCallback(async (storeId: number) => {
        const list = await fetchOpenSwaps(storeId);
        setSwaps(list.filter(item => item.status === 'OPEN'));
    }, []);

    const loadAll = useCallback(async () => {
        try {
            setPhase('loading');
            if (!user?.id) {
                setStores([]);
                setSwaps([]);
                setPhase('ready');
                return;
            }
            const storeList = await storeService.getEmployeeStores(user.id);
            const mapped: MyStore[] = storeList.map(store => ({
                id: store.id,
                storeName: store.storeName,
            }));
            setStores(mapped);
            const storeId =
                mapped.find(store => store.id === selectedStoreIdRef.current)?.id ?? mapped[0]?.id ?? null;
            selectedStoreIdRef.current = storeId;
            setSelectedStoreId(storeId);
            if (storeId !== null) {
                await loadSwaps(storeId);
            } else {
                setSwaps([]);
            }
            setPhase('ready');
        } catch (error) {
            console.warn('[SwapBoardScreen] load failed', error);
            setPhase('error');
        }
    }, [user?.id, loadSwaps]);

    useFocusEffect(
        useCallback(() => {
            loadAll();
        }, [loadAll]),
    );

    const selectStore = useCallback(
        async (storeId: number) => {
            if (storeId === selectedStoreId) {
                return;
            }
            selectedStoreIdRef.current = storeId;
            setSelectedStoreId(storeId);
            try {
                setPhase('loading');
                await loadSwaps(storeId);
                setPhase('ready');
            } catch (error) {
                console.warn('[SwapBoardScreen] store swap list failed', error);
                setPhase('error');
            }
        },
        [selectedStoreId, loadSwaps],
    );

    const doApply = useCallback(
        async (swap: SwapRequest) => {
            try {
                setApplyingId(swap.id);
                await applySwap(swap.id);
                AppToast.success('지원했어요. 사장님 확정을 기다려 주세요');
                if (selectedStore) {
                    await loadSwaps(selectedStore.id).catch(() => {});
                }
            } catch (error: any) {
                const status = error?.response?.status;
                const serverMessage = error?.response?.data?.message;
                if (status === 409) {
                    AppToast.error(serverMessage ?? '이미 지원했거나 마감된 모집이에요.');
                    if (selectedStore) {
                        await loadSwaps(selectedStore.id).catch(() => {});
                    }
                } else if (status === 400) {
                    AppToast.error(serverMessage ?? '본인 근무에는 지원할 수 없어요.');
                } else {
                    AppToast.error('지원에 실패했어요. 잠시 후 다시 시도해 주세요.');
                }
            } finally {
                setApplyingId(null);
            }
        },
        [selectedStore, loadSwaps],
    );

    const confirmApply = useCallback(
        (swap: SwapRequest) => {
            ConfirmSheet.confirm({
                title: '이 시간에 근무할 수 있나요?',
                description: `${formatDateLabel(swap.shiftDate)} ${shortTime(swap.startTime)} ~ ${shortTime(swap.endTime)} 근무에 지원해요.`,
                primary: {label: '지원하기', onPress: () => doApply(swap)},
                secondary: {label: '취소'},
            });
        },
        [doApply],
    );

    const header = <AppHeader title="대타 지원" onBack={() => navigation.goBack()} />;

    if (phase === 'loading') {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="대타 모집 확인 중" description="지금 모집 중인 대타를 불러오고 있어요." />
            </ScreenContainer>
        );
    }

    if (phase === 'error') {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="불러오지 못했어요"
                    description="네트워크 상태를 확인하고 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: loadAll}}
                />
            </ScreenContainer>
        );
    }

    if (stores.length === 0) {
        return (
            <ScreenContainer header={header}>
                <EmptyState
                    title="소속된 매장이 없어요"
                    description="매장에 합류하면 대타 모집을 볼 수 있어요."
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer header={header} padded={false}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {stores.length > 1 ? (
                    <View style={styles.chipRow}>
                        {stores.map(store => {
                            const active = store.id === selectedStore?.id;
                            return (
                                <Pressable
                                    key={store.id}
                                    accessibilityRole="button"
                                    accessibilityState={{selected: active}}
                                    onPress={() => selectStore(store.id)}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: active ? c.brandPrimarySoft : c.surface,
                                            borderColor: active ? c.brandPrimary : c.border,
                                        },
                                    ]}>
                                    <AppText
                                        variant="titleMd"
                                        tone={active ? 'brand' : 'secondary'}
                                        weight={active ? '700' : '500'}>
                                        {store.storeName}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : null}

                {swaps.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <EmptyState
                            title="지금 모집 중인 대타가 없어요"
                            description="사장님이 대타를 모집하면 여기에 표시돼요."
                        />
                    </View>
                ) : (
                    swaps.map(swap => {
                        const alreadyApplied = (swap.applicants ?? []).some(
                            applicant => applicant.employeeId === user?.id,
                        );
                        return (
                            <AppCard key={swap.id} style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={styles.cardInfo}>
                                        <AppText variant="headingSm">{formatDateLabel(swap.shiftDate)}</AppText>
                                        <AppText variant="bodyMd" tone="secondary" style={styles.timeText}>
                                            {shortTime(swap.startTime)} ~ {shortTime(swap.endTime)}
                                        </AppText>
                                        {swap.originalEmployeeName ? (
                                            <AppText variant="caption" tone="tertiary" style={styles.ownerText}>
                                                {swap.originalEmployeeName} 님의 근무
                                            </AppText>
                                        ) : null}
                                    </View>
                                    {alreadyApplied ? <AppBadge label="지원 완료" tone="success" /> : null}
                                </View>
                                <AppButton
                                    label={alreadyApplied ? '지원 완료' : '지원하기'}
                                    size="md"
                                    disabled={alreadyApplied}
                                    loading={applyingId === swap.id}
                                    onPress={() => confirmApply(swap)}
                                    style={styles.applyButton}
                                />
                            </AppCard>
                        );
                    })
                )}
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        flexGrow: 1,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    emptyWrap: {flex: 1},
    card: {marginBottom: spacing.md},
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    cardInfo: {flex: 1, marginRight: spacing.sm},
    timeText: {marginTop: 2},
    ownerText: {marginTop: spacing.xs},
    applyButton: {marginTop: spacing.md},
});

export default SwapBoardScreen;
