import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, AppText, EmptyState, ScreenContainer} from '../../../common/components/ds';
import {spacing, tokens} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import api from '../../../common/utils/api';

const CATEGORY_ICON: Record<InboxItem['category'], string> = {
    ATTENDANCE: 'time-outline',
    PAYROLL: 'cash-outline',
    BILLING: 'card-outline',
    NOTICE: 'megaphone-outline',
    MARKETING: 'gift-outline',
    SYSTEM: 'information-circle-outline',
};

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

/**
 * 38 NotificationCenter — 확정 시안.
 * 알림 인박스 + 카테고리 필터. load/open/읽음처리 로직 보존.
 */
const NotificationCenterScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const c = useThemeColors();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [filter, setFilter] = useState<Category>('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await api.get<InboxItem[]>('/api/notifications/inbox?page=0&size=50');
            setItems((res.data) ?? []);
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
        <ScreenContainer padded={false} header={<AppHeader title="알림" actions={[{label: '설정', onPress: () => navigation.navigate('NotificationSettings')}]} />}>
            <View style={styles.filters}>
                {FILTERS.map(f => (
                    <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={({pressed}) => [
                            styles.filterChip,
                            {backgroundColor: filter === f.key ? c.brandPrimary : c.surfaceMuted},
                            pressed && {opacity: 0.7},
                        ]}>
                        <AppText
                            variant="caption"
                            weight="800"
                            tone={filter === f.key ? 'inverse' : 'secondary'}>
                            {f.label}
                        </AppText>
                    </Pressable>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={it => String(it.id)}
                renderItem={({item}) => (
                    <Pressable onPress={() => open(item)} style={({pressed}) => [styles.row, pressed && {opacity: 0.8}]}>
                        <View style={[styles.iconWrap, {backgroundColor: item.isRead ? c.surfaceMuted : c.brandPrimarySoft}]}>
                            <Ionicons
                                name={CATEGORY_ICON[item.category]}
                                size={22}
                                color={item.isRead ? c.textTertiary : c.brandPrimary}
                            />
                        </View>
                        <View style={styles.rowBody}>
                            <View style={styles.titleRow}>
                                <AppText variant="bodyLg" weight={item.isRead ? '500' : '700'} style={styles.flex} numberOfLines={1}>{item.title}</AppText>
                                {item.isRead ? null : <View style={[styles.unreadDot, {backgroundColor: c.brandPrimary}]} />}
                            </View>
                            <AppText variant="bodyMd" tone="secondary" numberOfLines={2} style={styles.body}>{item.body}</AppText>
                            <AppText variant="caption" tone="tertiary" style={styles.date}>{formatRel(item.createdAt)}</AppText>
                        </View>
                    </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={[styles.separator, {backgroundColor: c.divider}]} />}
                ListEmptyComponent={
                    <EmptyState
                        glyph={<Ionicons name="notifications-outline" size={40} color={c.textInverse} />}
                        markColor={c.brandSecondary}
                        title={loading ? '불러오는 중…' : '받은 알림이 없어요'}
                        description={loading ? undefined : '새 알림이 오면 여기에 표시돼요.'}
                    />
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={filtered.length === 0 ? styles.flexCenter : styles.listPad}
            />
        </ScreenContainer>
    );
};

function formatRel(iso: string): string {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) {
        return '방금';
    }
    if (diff < 3600_000) {
        return `${Math.floor(diff / 60_000)}분 전`;
    }
    if (diff < 86_400_000) {
        return `${Math.floor(diff / 3600_000)}시간 전`;
    }
    if (diff < 7 * 86_400_000) {
        return `${Math.floor(diff / 86_400_000)}일 전`;
    }
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
    filters: {flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md},
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: tokens.radius.pill,
    },
    listPad: {paddingBottom: spacing.xl},
    row: {flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md},
    iconWrap: {width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    unreadDot: {width: 8, height: 8, borderRadius: 4},
    rowBody: {flex: 1},
    body: {marginTop: 4},
    date: {marginTop: 6},
    separator: {height: 1, marginLeft: spacing.lg + 44 + spacing.md},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
});

export default NotificationCenterScreen;
