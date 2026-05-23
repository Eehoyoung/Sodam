import React, {useCallback, useEffect, useState} from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import api from '../../../common/utils/api';

type Category = 'ALL' | 'ATTENDANCE' | 'PAYROLL' | 'BILLING' | 'NOTICE';

interface InboxItem {
    id: number;
    category: 'ATTENDANCE' | 'PAYROLL' | 'BILLING' | 'NOTICE' | 'MARKETING' | 'SYSTEM';
    title: string;
    body: string;
    deepLink?: string;
    isRead: boolean;
    createdAt: string;
}

const FILTERS: Array<{key: Category; label: string}> = [
    {key: 'ALL', label: '전체'},
    {key: 'ATTENDANCE', label: '출퇴근'},
    {key: 'PAYROLL', label: '급여'},
    {key: 'BILLING', label: '결제'},
    {key: 'NOTICE', label: '공지'},
];

const NotificationCenterScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [filter, setFilter] = useState<Category>('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await api.get<InboxItem[]>('/api/notifications/inbox?page=0&size=50');
            setItems((res.data as InboxItem[]) ?? []);
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

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const open = async (item: InboxItem) => {
        try {
            if (!item.isRead) {
                await api.post(`/api/notifications/inbox/${item.id}/read`);
                setItems(items.map(i => (i.id === item.id ? {...i, isRead: true} : i)));
            }
        } catch (_) {/* ignore */}

        if (item.deepLink?.startsWith('sodam://attendance')) {
            navigation.navigate('AttendanceCalendar');
        } else if (item.deepLink?.startsWith('sodam://salary')) {
            navigation.navigate('SalaryList');
        } else if (item.deepLink?.startsWith('sodam://subscription')) {
            navigation.navigate('Subscribe');
        }
    };

    const filtered = filter === 'ALL' ? items : items.filter(i => i.category === filter);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>알림</Text>
            </View>
            <View style={styles.filters}>
                {FILTERS.map(f => (
                    <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={({pressed}) => [
                            styles.filterChip,
                            filter === f.key && styles.filterChipActive,
                            pressed && {opacity: 0.7},
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === f.key && styles.filterTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={it => String(it.id)}
                renderItem={({item}) => (
                    <Pressable
                        onPress={() => open(item)}
                        style={({pressed}) => [styles.row, pressed && {opacity: 0.8}]}
                    >
                        <View
                            style={[
                                styles.unreadDot,
                                {backgroundColor: item.isRead ? tokens.colors.surfaceMuted : tokens.colors.brandPrimary},
                            ]}
                        />
                        <View style={{flex: 1}}>
                            <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]}>
                                {item.title}
                            </Text>
                            <Text style={styles.rowBody} numberOfLines={2}>
                                {item.body}
                            </Text>
                            <Text style={styles.rowDate}>{formatRel(item.createdAt)}</Text>
                        </View>
                    </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyText}>
                            {loading ? '불러오는 중…' : '받은 알림이 없어요.'}
                        </Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={items.length === 0 ? styles.flexCenter : undefined}
            />
        </SafeAreaView>
    );
};

function formatRel(iso: string): string {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return '방금';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}시간 전`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}일 전`;
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    header: {paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.5,
    },
    filters: {
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.md,
    },
    filterChip: {
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.xs,
        borderRadius: tokens.radius.pill,
        backgroundColor: tokens.colors.surfaceMuted,
    },
    filterChipActive: {backgroundColor: tokens.colors.brandPrimary},
    filterText: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm, fontWeight: '500'},
    filterTextActive: {color: tokens.colors.textInverse, fontWeight: '700'},
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        gap: tokens.spacing.md,
    },
    unreadDot: {width: 8, height: 8, borderRadius: 4, marginTop: 8},
    rowTitle: {fontSize: tokens.typography.sizes.md, color: tokens.colors.textPrimary},
    rowTitleUnread: {fontWeight: tokens.typography.weights.bold},
    rowBody: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary, marginTop: 2, lineHeight: 20},
    rowDate: {fontSize: tokens.typography.sizes.xs, color: tokens.colors.textTertiary, marginTop: 4},
    separator: {height: 1, backgroundColor: tokens.colors.divider, marginLeft: tokens.spacing.lg + 16},
    emptyBox: {alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.huge},
    emptyEmoji: {fontSize: 64, marginBottom: tokens.spacing.lg},
    emptyText: {color: tokens.colors.textTertiary, fontSize: tokens.typography.sizes.md},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
});

export default NotificationCenterScreen;
