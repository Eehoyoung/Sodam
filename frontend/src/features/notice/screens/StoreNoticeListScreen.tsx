import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, useFocusEffect, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    type BadgeTone,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchStoreNotices, fetchNoticeReads, formatNoticeDate, NoticeRead, StoreNotice} from '../services/noticeService';

type Route = RouteProp<{N: {storeId: number}}, 'N'>;

/** 읽음 진행도에 따른 배지 톤. 전원 확인=success, 일부=info, 0명=neutral. */
function readTone(read: number, total: number): BadgeTone {
    if (total > 0 && read >= total) {
        return 'success';
    }
    if (read > 0) {
        return 'info';
    }
    return 'neutral';
}

/**
 * 매장 공지 목록 (M-NEW-04) — 사장 전용. 공지별 읽음 N/M + 읽은 직원 펼쳐보기.
 */
const StoreNoticeListScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [items, setItems] = useState<StoreNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [reads, setReads] = useState<NoticeRead[]>([]);
    const [readsLoading, setReadsLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await fetchStoreNotices(storeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const toggleReads = useCallback(async (noticeId: number) => {
        if (expandedId === noticeId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(noticeId);
        setReadsLoading(true);
        try {
            setReads(await fetchNoticeReads(storeId, noticeId));
        } catch {
            setReads([]);
        } finally {
            setReadsLoading(false);
        }
    }, [expandedId, storeId]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="매장 공지" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="공지 작성"
                    onPress={() => navigation.navigate('WriteNotice', {storeId})}
                />
            }>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="공지를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="megaphone-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="아직 올린 공지가 없어요"
                    description="공지를 올리면 직원들이 확인하고 읽음을 남길 수 있어요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => {
                        const expanded = expandedId === it.id;
                        return (
                            <AppCard key={it.id} variant="flat" onPress={() => toggleReads(it.id)}>
                                <View style={styles.headerRow}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" numberOfLines={1}>{it.title}</AppText>
                                        <AppText variant="caption" tone="tertiary">{formatNoticeDate(it.createdAt)}</AppText>
                                    </View>
                                    <AppBadge
                                        label={`읽음 ${it.readCount}/${it.totalEmployees}`}
                                        tone={readTone(it.readCount, it.totalEmployees)}
                                    />
                                </View>
                                <AppText variant="bodyMd" tone="secondary" style={styles.body} numberOfLines={expanded ? undefined : 2}>
                                    {it.body}
                                </AppText>
                                {expanded ? (
                                    <View style={[styles.reads, {borderTopColor: c.border}]}>
                                        <AppText variant="caption" tone="secondary" style={styles.readsTitle}>확인한 직원</AppText>
                                        {readsLoading ? (
                                            <AppText variant="caption" tone="tertiary">불러오는 중...</AppText>
                                        ) : reads.length === 0 ? (
                                            <AppText variant="caption" tone="tertiary">아직 확인한 직원이 없어요.</AppText>
                                        ) : (
                                            reads.map(r => (
                                                <View key={r.employeeId} style={styles.readRow}>
                                                    <Ionicons name="checkmark-circle" size={16} color={c.success} />
                                                    <AppText variant="caption" tone="secondary">
                                                        {r.employeeName} · {formatNoticeDate(r.readAt)}
                                                    </AppText>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                ) : null}
                            </AppCard>
                        );
                    })}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {gap: spacing.sm},
    headerRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
    flex: {flex: 1},
    body: {marginTop: spacing.sm},
    reads: {marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs},
    readsTitle: {marginBottom: spacing.xs},
    readRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
});

export default StoreNoticeListScreen;
