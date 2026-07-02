import {AppToast, ConfirmSheet, AppBadge, AppButton, AppCard, AppHeader, AppText, EmptyState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
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
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const [items, setItems] = useState<PendingItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const storesRes = await api.get<any[]>('/api/stores/master/current');
            const stores = (storesRes.data) ?? [];
            const collected: PendingItem[] = [];
            for (const s of stores) {
                const statsRes = await api.get<any>(`/api/store-queries/${s.id}/stats/today`);
                const data = statsRes.data;
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
        ConfirmSheet.confirm({
            title: `${item.employeeName} 님께 알림을 보낼까요?`,
            description: '출근 확인 푸시 알림이 직원에게 즉시 발송돼요.',
            primary: {
                label: '보내기',
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
            secondary: {label: '취소'},
        });
    };

    return (
        <ScreenContainer padded={false} header={<AppHeader title="출퇴근 이상" onBack={() => navigation.goBack()} />}>
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
                        glyph={<Ionicons name="checkmark-sharp" size={28} color={c.textInverse} />}
                        markColor={c.success}
                        title="모두 정상이에요"
                        description="오늘 출근 누락이나 미체크아웃이 없어요."
                    />
                ) : (
                    <>
                        <AppCard variant="navy" hero style={styles.heroCard}>
                            <AppText variant="caption" tone="inverse" style={styles.heroLabel}>정산 전 확인할 일</AppText>
                            <View style={styles.heroNumRow}>
                                <AppText tone="inverse" style={styles.heroNumber}>{items.length}</AppText>
                                <AppText variant="headingSm" tone="inverse" style={styles.heroUnit}>건</AppText>
                            </View>
                            <AppText variant="bodyMd" tone="inverse" style={styles.heroSub}>
                                퇴근 누락과 미출근 기록을 먼저 정리하세요.
                            </AppText>
                        </AppCard>

                        <View style={styles.list}>
                            {items.map((it, idx) => (
                                <AppCard key={idx} variant="plain">
                                    <View style={styles.itemRow}>
                                        <View style={styles.itemLeft}>
                                            <Ionicons name="person-circle-outline" size={28} color={c.warning} />
                                            <View style={styles.flexShrink}>
                                                <AppText variant="titleMd" numberOfLines={1}>{it.employeeName}</AppText>
                                                <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.itemSub}>
                                                    {it.storeName}
                                                </AppText>
                                            </View>
                                        </View>
                                        <AppBadge label={it.type === 'NO_CHECK_IN' ? '미출근' : '미퇴근'} tone="warning" />
                                    </View>
                                    <View style={styles.actions}>
                                        <AppButton label="알림 보내기" size="md" fullWidth={false} onPress={() => sendNudge(it)} style={styles.actionBtn} />
                                        <AppButton
                                            label="수동 기록"
                                            size="md"
                                            variant="outline"
                                            fullWidth={false}
                                            onPress={() => navigation.navigate('Attendance')}
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
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    heroCard: {},
    heroLabel: {opacity: 0.82, fontWeight: '800'},
    heroNumRow: {flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs},
    heroNumber: {fontSize: 52, lineHeight: 56, fontWeight: '800', letterSpacing: -1},
    heroUnit: {marginLeft: spacing.xs},
    heroSub: {marginTop: spacing.sm, opacity: 0.82},
    list: {marginTop: spacing.xl, gap: spacing.md},
    itemRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    itemLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1},
    flexShrink: {flexShrink: 1},
    itemSub: {marginTop: 2},
    actions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg},
    actionBtn: {flex: 1},
});

export default MissingAttendanceCenterScreen;
