import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
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
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {ackNotice, fetchMyNotices, formatNoticeDate, StoreNotice} from '../services/noticeService';

/**
 * 내 공지 (E-NEW-06) — 직원 본인 소속 매장의 공지 + "확인했어요" 읽음확인.
 */
const MyNoticeScreen: React.FC = () => {
    const navigation = useNavigation();
    const c = useThemeColors();

    const [items, setItems] = useState<StoreNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [acking, setAcking] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await fetchMyNotices());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const ack = useCallback(async (noticeId: number) => {
        setAcking(noticeId);
        try {
            await ackNotice(noticeId);
            setItems(prev => prev.map(n => (n.id === noticeId ? {...n, readByMe: true} : n)));
        } catch {
            // 멱등이라 재시도 안전. 화면 상태만 유지.
        } finally {
            setAcking(null);
        }
    }, []);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="공지" onBack={() => navigation.goBack()} />}>
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
                    title="새 공지가 없어요"
                    description="사장님이 공지를 올리면 여기에서 확인할 수 있어요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.headerRow}>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd" numberOfLines={1}>{it.title}</AppText>
                                    <AppText variant="caption" tone="tertiary">{formatNoticeDate(it.createdAt)}</AppText>
                                </View>
                                {it.readByMe ? <AppBadge label="확인함" tone="success" /> : null}
                            </View>
                            <AppText variant="bodyMd" tone="secondary" style={styles.body}>{it.body}</AppText>
                            {it.readByMe ? null : (
                                <AppButton
                                    label="확인했어요"
                                    size="md"
                                    variant="primary"
                                    loading={acking === it.id}
                                    onPress={() => ack(it.id)}
                                    style={styles.cta}
                                />
                            )}
                        </AppCard>
                    ))}
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
    cta: {marginTop: spacing.md},
});

export default MyNoticeScreen;
