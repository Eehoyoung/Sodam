import {AppToast} from '../../../common/components/ds';
import React, {useCallback, useEffect, useState} from 'react';
import {Alert, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {layout, spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';

interface PendingItem {
    employeeId: number;
    employeeName: string;
    type: 'NO_CHECK_IN' | 'NO_CHECK_OUT';
    storeName: string;
    referenceTime?: string;
}

/**
 * 25 MissingAttendanceCenter — 확정 시안.
 * 사장 출퇴근 이상 알림 센터. load/sendNudge 로직 + 당겨서 새로고침 보존.
 */
const MissingAttendanceCenterScreen: React.FC = () => {
    const [items, setItems] = useState<PendingItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const storesRes = await api.get<any[]>('/api/stores/master/current');
            const stores = (storesRes.data as any[]) ?? [];
            const collected: PendingItem[] = [];
            for (const s of stores) {
                const statsRes = await api.get<any>(`/api/store-queries/${s.id}/stats/today`);
                const data = statsRes.data as any;
                (data?.pendingEmployees ?? []).forEach((name: string, idx: number) => {
                    collected.push({
                        employeeId: idx,
                        employeeName: name,
                        type: 'NO_CHECK_IN',
                        storeName: data.storeName ?? s.storeName,
                    });
                });
            }
            setItems(collected);
        } catch (_) {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const sendNudge = (item: PendingItem) => {
        Alert.alert('푸시 알림 발송', `${item.employeeName} 님께 출근 확인 알림을 보내시겠어요?`, [
            {text: '취소', style: 'cancel'},
            {
                text: '보내기',
                onPress: async () => {
                    try {
                        await api.post('/api/notifications/push-to-employee', {
                            employeeId: item.employeeId,
                            title: '출근 확인 부탁드려요',
                            body: `${item.storeName} 매장 출근이 등록되지 않았어요. 확인해 주세요.`,
                        });
                        AppToast.success('직원에게 알림을 보냈어요.');
                    } catch (e: any) {
                        AppToast.error('알림 발송에 실패했어요.');
                    }
                },
            },
        ]);
    };

    return (
        <ScreenContainer padded={false} header={<AppHeader title="출퇴근 이상" />}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            load();
                        }}
                    />
                }>
                {loading ? (
                    <LoadingState title="확인하고 있어요" description="오늘 출퇴근 이상 기록을 정리하는 중입니다" />
                ) : items.length === 0 ? (
                    <EmptyState
                        glyph="✓"
                        markColor="#12A87B"
                        title="모두 정상이에요"
                        description="오늘 출근 누락이나 미체크아웃이 없어요."
                    />
                ) : (
                    <>
                        <AppCard variant="navy" hero>
                            <AppText variant="headingSm" tone="inverse">정산 전 {items.length}건 확인</AppText>
                            <AppText variant="bodyMd" tone="inverse" style={styles.heroSub}>
                                퇴근 누락과 미출근 기록을 먼저 정리하세요.
                            </AppText>
                        </AppCard>

                        <View style={styles.list}>
                            {items.map((it, idx) => (
                                <AppCard key={idx} variant="flat">
                                    <View style={styles.itemRow}>
                                        <View style={styles.flexShrink}>
                                            <AppText variant="titleMd">{it.employeeName}</AppText>
                                            <AppText variant="caption" tone="secondary" style={styles.itemSub}>
                                                {it.storeName}
                                            </AppText>
                                        </View>
                                        <AppBadge label={it.type === 'NO_CHECK_IN' ? '미출근' : '미퇴근'} tone="warning" />
                                    </View>
                                    <View style={styles.actions}>
                                        <AppButton label="알림 보내기" size="sm" fullWidth={false} onPress={() => sendNudge(it)} style={styles.actionBtn} />
                                        <AppButton
                                            label="수동 기록"
                                            size="sm"
                                            variant="outline"
                                            fullWidth={false}
                                            onPress={() => Alert.alert('안내', '수동 기록은 출퇴근 보드에서 가능해요.')}
                                            style={styles.actionBtn}
                                        />
                                    </View>
                                </AppCard>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    heroSub: {marginTop: 4, opacity: 0.82},
    list: {marginTop: spacing.md, gap: spacing.sm},
    itemRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flexShrink: {flexShrink: 1},
    itemSub: {marginTop: 2},
    actions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md},
    actionBtn: {flex: 1},
});

export default MissingAttendanceCenterScreen;
