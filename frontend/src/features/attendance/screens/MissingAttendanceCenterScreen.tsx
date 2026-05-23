import React, {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Badge from '../../../common/components/data-display/Badge';
import Button from '../../../common/components/form/Button';
import api from '../../../common/utils/api';

interface PendingItem {
    employeeId: number;
    employeeName: string;
    type: 'NO_CHECK_IN' | 'NO_CHECK_OUT';
    storeName: string;
    referenceTime?: string;
}

/**
 * 사장 출퇴근 이상 알림 센터 (PRD_OWNER S-601).
 *
 * BE: `/api/store-queries/{storeId}/stats/today` 의 pendingEmployees 활용 + 추가 검색.
 * 현재는 매장 1개 가정 (다매장은 P2).
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
        Alert.alert(
            '푸시 알림 발송',
            `${item.employeeName} 님께 출근 확인 알림을 보내시겠어요?`,
            [
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
                            Alert.alert('전송 완료', '직원에게 알림을 보냈어요.');
                        } catch (e: any) {
                            Alert.alert('실패', '알림 발송에 실패했어요.');
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                <Text style={styles.title}>출퇴근 이상 알림 센터</Text>
                <Text style={styles.subtitle}>
                    오늘 출근하지 않았거나 퇴근 기록이 없는 직원이에요.{'\n'}
                    원터치로 알림을 보낼 수 있어요.
                </Text>

                {loading ? (
                    <Text style={styles.empty}>불러오는 중…</Text>
                ) : items.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>✅</Text>
                        <Text style={styles.emptyTitle}>모두 정상이에요</Text>
                        <Text style={styles.emptyBody}>
                            오늘 출근 누락이나 미체크아웃이 없어요.
                        </Text>
                    </View>
                ) : (
                    items.map((it, idx) => (
                        <Card key={idx} bordered style={styles.itemCard}>
                            <View style={styles.itemRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.itemName}>{it.employeeName}</Text>
                                    <Text style={styles.itemStore}>{it.storeName}</Text>
                                </View>
                                <Badge
                                    text={it.type === 'NO_CHECK_IN' ? '미출근' : '미퇴근'}
                                    type="warning"
                                />
                            </View>
                            <View style={styles.itemActions}>
                                <Button title="알림 보내기" onPress={() => sendNudge(it)} variant="primary" size="sm" />
                                <Button
                                    title="수동 기록"
                                    onPress={() => Alert.alert('안내', '수동 기록은 출퇴근 보드에서 가능해요.')}
                                    variant="outline"
                                    size="sm"
                                />
                            </View>
                        </Card>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        lineHeight: 22,
        marginBottom: tokens.spacing.xl,
    },
    empty: {textAlign: 'center', color: tokens.colors.textTertiary, padding: tokens.spacing.xl},
    emptyBox: {alignItems: 'center', padding: tokens.spacing.huge},
    emptyEmoji: {fontSize: 64, marginBottom: tokens.spacing.lg},
    emptyTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.success,
        marginBottom: tokens.spacing.sm,
    },
    emptyBody: {color: tokens.colors.textSecondary, textAlign: 'center', lineHeight: 22},
    itemCard: {marginBottom: tokens.spacing.md},
    itemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    itemName: {fontSize: tokens.typography.sizes.lg, fontWeight: '700', color: tokens.colors.textPrimary},
    itemStore: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary, marginTop: 2},
    itemActions: {flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.md},
});

export default MissingAttendanceCenterScreen;
