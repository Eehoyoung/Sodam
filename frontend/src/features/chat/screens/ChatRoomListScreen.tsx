/**
 * ChatRoomListScreen — 채용 채팅 채팅방 목록(recruitment-monetization-gamification-plan.md §4,
 * Phase D). `GET /api/chat-rooms/me` 를 사장/직원 공용으로 렌더한다(counterpart 가 상대적으로
 * 계산돼 내려오므로 화면 로직은 역할 분기 없이 동일).
 *
 * 진입점: [직원] `EmployeeRecruitmentScreen` 허브 "채팅" 탭 / [사장] `JobSeekerListScreen` 헤더
 * 액션(⋮ 채팅 아이콘) / [공통] `JobOfferInboxScreen` 수락된 제안·지원 카드의 "채팅하기" 버튼.
 *
 * 목록 갱신: 쓰기(신규 메시지 전송) 후 미리보기·안읽음 카운트를 최신화해야 하므로
 * `useFocusEffect` + `refetch` 패턴(frontend.md, 9개 화면 적용 기존 패턴)을 따른다 — 이 화면은
 * 여러 진입점에서 push 되는 독립 라우트라 탭 조건부 마운트에 기댈 수 없다.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useMyChatRooms} from '../hooks/useChatQueries';
import {ChatRoomListItem} from '../types';
import {SEEKING_TYPE_LABELS} from '../../recruitment/types';
import {formatTimeRange} from '../../recruitment/utils/formatAvailability';

interface Props {
    /** 개발용 시각 검증 전용 — 실 API 대신 고정 목록을 표시한다. */
    visualFixture?: ChatRoomListItem[];
}

const ChatRoomListScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const roomsQuery = useMyChatRooms();

    useFocusEffect(
        React.useCallback(() => {
            if (!visualFixture) {
                roomsQuery.refetch();
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [visualFixture]),
    );

    const rooms = visualFixture ?? roomsQuery.data ?? [];
    const loading = !visualFixture && roomsQuery.isLoading;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="채팅" onBack={() => navigation.goBack()} />}
            testID="chat-room-list-screen">
            {loading ? (
                <LoadingState title="채팅방 불러오는 중" description="잠시만 기다려 주세요" />
            ) : !visualFixture && roomsQuery.isError ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="채팅방 목록을 가져오지 못했어요."
                    primary={{label: '다시 시도', onPress: () => roomsQuery.refetch()}}
                />
            ) : rooms.length === 0 ? (
                <View testID="chat-room-list-empty">
                    <EmptyState
                        title="아직 채팅방이 없어요"
                        description="채용 제안을 수락하거나 지원서를 열람하면 채팅방이 열려요."
                    />
                </View>
            ) : (
                <View style={styles.list} testID="chat-room-list">
                    {rooms.map(room => (
                        <ChatRoomRow
                            key={room.id}
                            room={room}
                            onPress={() => navigation.navigate('ChatRoom', {roomId: room.id, room})}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

interface ChatRoomRowProps {
    room: ChatRoomListItem;
    onPress: () => void;
}

const ChatRoomRow: React.FC<ChatRoomRowProps> = ({room, onPress}) => {
    const c = useThemeColors();
    const readOnly = room.status === 'READ_ONLY';

    return (
        <AppCard
            variant="flat"
            onPress={onPress}
            style={[styles.card, readOnly ? styles.cardReadOnly : null]}
            testID={`chat-room-row-${room.id}`}>
            <View style={styles.topRow}>
                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.flex1}>
                    {room.counterpartName}
                </AppText>
                {readOnly ? (
                    <AppBadge label="읽기 전용" tone="neutral" />
                ) : room.unreadCount > 0 ? (
                    <View style={[styles.unreadBadge, {backgroundColor: c.brandPrimary}]} testID={`chat-room-unread-${room.id}`}>
                        <AppText variant="caption" weight="800" style={{color: c.textInverse}}>
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </AppText>
                    </View>
                ) : null}
            </View>

            <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {room.storeName} · {SEEKING_TYPE_LABELS[room.workType] ?? room.workType} ·{' '}
                {formatTimeRange(room.startTime, room.endTime)}
            </AppText>

            {room.lastMessagePreview ? (
                <AppText
                    variant="bodyMd"
                    tone={readOnly ? 'tertiary' : 'primary'}
                    numberOfLines={1}
                    style={styles.previewText}>
                    {room.lastMessagePreview}
                </AppText>
            ) : (
                <AppText variant="bodyMd" tone="tertiary" style={styles.previewText}>
                    아직 메시지가 없어요.
                </AppText>
            )}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    list: {gap: spacing.sm, paddingBottom: spacing.xxl},
    card: {gap: spacing.xs},
    cardReadOnly: {opacity: 0.6},
    topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flex1: {flex: 1, minWidth: 0},
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewText: {marginTop: 2},
});

export default ChatRoomListScreen;
