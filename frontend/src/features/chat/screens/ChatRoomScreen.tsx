/**
 * ChatRoomScreen — 채용 채팅 채팅방(recruitment-monetization-gamification-plan.md §4, Phase D,
 * docs/260801/recruitment-design-artifacts.html "💬 채팅" 1:1).
 *
 * §4.1 "채팅방은 대화가 아니라 채용 협상 공간" — 상단에 매칭 컨텍스트 카드(매장·직무·시급·근무일)를
 * 스크롤과 무관하게 고정 노출한다. 메시지는 mine(본인 발신)에 따라 좌/우 말풍선, masked(PII 자동
 * 마스킹)면 안내 배지, 시스템 메시지는 중앙정렬로 구분한다(§4.2~4.3).
 *
 * 실시간: `useChatLiveSync` 로 `/topic/chat.{roomId}` 구독. WS 페이로드의 `mine` 은 발행 시점에
 * "수신자" 관점으로 고정돼 있어(발신자 자신도 같은 토픽을 구독 중이면 자기 메시지를 mine:false로
 * 받는다) 신뢰하지 않고, 로그인 사용자 id 와 `senderUserId` 를 비교해 재계산한다(storeSyncClient.ts
 * `ChatSyncMessage` 주석 참고).
 *
 * 읽기 전용(§4.6): route param 의 초기 상태로 시작하되, 발신 중 서버가 `CHAT_ROOM_READ_ONLY`(409)를
 * 반환하면 그 자리에서 로컬 상태를 전환해 이후 입력창을 즉시 비활성화한다(서버 lazy 판정과 동기화).
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, AppText, AppToast, ConfirmSheet, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {colors, layout, radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import type {ChatSyncMessage} from '../../../common/realtime/storeSyncClient';
import {useChatLiveSync} from '../../../common/realtime/useChatLiveSync';
import {chatQueryKeys, mergeIncomingChatMessage, useBlockChatUser, useChatMessages, useReportChatMessage, useSendChatMessage} from '../hooks/useChatQueries';
import {CHAT_ERROR_MESSAGES, ChatErrorCode, ChatMessage, ChatMessageType, ChatReportReason, ChatRoomStatus} from '../types';
import {SEEKING_TYPE_LABELS} from '../../recruitment/types';
import {formatTimeRange} from '../../recruitment/utils/formatAvailability';
import {formatDaySeparatorLabel, formatMessageTime, messageDateKey} from '../utils/chatTime';
import ChatReportSheet from '../components/ChatReportSheet';

const QUICK_REPLIES = ['네 좋습니다 👍', '몇 시까지 오면 될까요?', '죄송해요, 일정이 안돼요'];

function extractErrorCode(err: unknown): ChatErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as ChatErrorCode | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

interface Props {
    /** 개발용 시각 검증 전용 — 실 API 대신 고정 메시지 목록을 표시한다. */
    visualFixture?: {messages: ChatMessage[]};
}

const ChatRoomScreen: React.FC<Props> = ({visualFixture}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'ChatRoom'>>();
    const {roomId, room} = route.params;
    const {user} = useAuth();
    const queryClient = useQueryClient();

    const [roomStatus, setRoomStatus] = useState<ChatRoomStatus>(room.status);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
    const [draft, setDraft] = useState('');

    const messagesQuery = useChatMessages(visualFixture ? undefined : roomId);
    const sendMutation = useSendChatMessage(roomId);
    const reportMutation = useReportChatMessage();
    const blockMutation = useBlockChatUser();
    const scrollRef = useRef<ScrollView>(null);

    useChatLiveSync(
        visualFixture ? undefined : roomId,
        useCallback(
            (payload: ChatSyncMessage) => {
                const mine = payload.messageType !== 'SYSTEM' && payload.senderUserId !== null && payload.senderUserId === user?.id;
                const message: ChatMessage = {
                    id: payload.id,
                    chatRoomId: payload.chatRoomId,
                    senderUserId: payload.senderUserId,
                    senderName: payload.senderName,
                    messageType: payload.messageType as ChatMessageType,
                    content: payload.content,
                    masked: payload.masked,
                    mine,
                    sentAt: payload.sentAt,
                    readAt: payload.readAt,
                };
                queryClient.setQueryData<ChatMessage[]>(chatQueryKeys.messages(roomId), prev =>
                    mergeIncomingChatMessage(prev, message),
                );
                queryClient.invalidateQueries({queryKey: chatQueryKeys.rooms()});
            },
            [roomId, user?.id, queryClient],
        ),
    );

    const messages = visualFixture?.messages ?? messagesQuery.data ?? [];
    const readOnly = roomStatus === 'READ_ONLY';

    const handleSend = async (content: string) => {
        const value = content.trim();
        if (!value || sendMutation.isPending) {
            return;
        }
        try {
            await sendMutation.mutateAsync(value);
            setDraft('');
            requestAnimationFrame(() => scrollRef.current?.scrollToEnd({animated: true}));
        } catch (err: unknown) {
            const code = extractErrorCode(err);
            if (code === 'CHAT_ROOM_READ_ONLY') {
                setRoomStatus('READ_ONLY');
            }
            const msg = (code ? CHAT_ERROR_MESSAGES[code] : undefined) ?? extractErrorMessage(err) ?? '메시지를 보내지 못했어요.';
            AppToast.error(msg);
        }
    };

    const handleReportSubmit = async (reason: ChatReportReason) => {
        if (!reportTarget) {
            return;
        }
        try {
            await reportMutation.mutateAsync({messageId: reportTarget.id, reason});
            AppToast.success('신고가 접수됐어요. 검토 후 안내드릴게요.');
            setReportTarget(null);
            if (!visualFixture) {
                queryClient.invalidateQueries({queryKey: chatQueryKeys.messages(roomId)});
            }
        } catch (err: unknown) {
            const code = extractErrorCode(err);
            AppToast.error((code ? CHAT_ERROR_MESSAGES[code] : undefined) ?? extractErrorMessage(err) ?? '신고를 접수하지 못했어요.');
        }
    };

    const handleBlockConfirm = () => {
        ConfirmSheet.confirm({
            title: `${room.counterpartName}님을 차단할까요?`,
            description: '차단하면 리스트·제안·채팅 전 구간에서 서로에게 보이지 않아요.',
            primary: {
                label: '차단하기',
                destructive: true,
                onPress: async () => {
                    try {
                        await blockMutation.mutateAsync(room.counterpartUserId);
                        AppToast.success('차단했어요.');
                        navigation.goBack();
                    } catch (err: unknown) {
                        AppToast.error(extractErrorMessage(err) ?? '차단하지 못했어요.');
                    }
                },
            },
            secondary: {label: '취소'},
        });
    };

    let lastDateKey: string | null = null;

    return (
        <ScreenContainer
            header={
                <View>
                    <AppHeader
                        title={room.counterpartName}
                        onBack={() => navigation.goBack()}
                        actions={[
                            {
                                icon: <Ionicons name="ellipsis-vertical" size={18} color={c.textPrimary} />,
                                accessibilityLabel: '더보기',
                                onPress: () => setMenuOpen(v => !v),
                            },
                        ]}
                    />
                    {menuOpen ? (
                        <View style={[styles.menuCard, {backgroundColor: c.background, borderColor: c.border}]}>
                            <Pressable
                                testID="chat-room-block-menu-item"
                                accessibilityRole="button"
                                onPress={() => {
                                    setMenuOpen(false);
                                    handleBlockConfirm();
                                }}
                                style={styles.menuRow}>
                                <AppText variant="bodyMd" weight="700" tone="error">
                                    이 사용자 차단하기
                                </AppText>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            }
            padded={false}
            keyboardAvoiding
            testID="chat-room-screen">
            <Pressable style={styles.flex} onPress={() => setMenuOpen(false)} disabled={!menuOpen}>
                <View style={[styles.jobPin, {backgroundColor: recruit.primarySoft, borderColor: recruit.primary}]} testID="chat-room-context-card">
                    <AppText variant="caption" weight="700" style={{color: recruit.primaryPressed}}>
                        📌 {room.storeName} · {SEEKING_TYPE_LABELS[room.workType] ?? room.workType} · 시급{' '}
                        {room.hourlyWage.toLocaleString('ko-KR')}원
                    </AppText>
                    <AppText variant="caption" style={{color: recruit.primaryPressed}}>
                        {room.workDate ? `${room.workDate} · ` : ''}
                        {formatTimeRange(room.startTime, room.endTime)}
                    </AppText>
                </View>

                <ScrollView
                    ref={scrollRef}
                    style={styles.thread}
                    contentContainerStyle={styles.threadContent}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: false})}
                    testID="chat-message-thread">
                    {!visualFixture && messagesQuery.isLoading ? (
                        <AppText variant="caption" tone="secondary" center>
                            대화 불러오는 중...
                        </AppText>
                    ) : null}
                    {messages.map(message => {
                        const dateKey = messageDateKey(message.sentAt);
                        const showSeparator = dateKey !== lastDateKey;
                        lastDateKey = dateKey;
                        return (
                            <React.Fragment key={message.id}>
                                {showSeparator ? (
                                    <View style={styles.daySepWrap}>
                                        <AppText variant="caption" tone="tertiary" style={[styles.daySepText, {backgroundColor: c.surfaceCanvas}]}>
                                            {formatDaySeparatorLabel(dateKey)}
                                        </AppText>
                                    </View>
                                ) : null}
                                {message.messageType === 'SYSTEM' ? (
                                    <AppText
                                        variant="caption"
                                        tone="secondary"
                                        center
                                        style={styles.systemMsg}
                                        testID={`chat-message-system-${message.id}`}>
                                        {message.content}
                                    </AppText>
                                ) : (
                                    <MessageBubble message={message} onLongPress={() => setReportTarget(message)} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </ScrollView>

                {readOnly ? (
                    <View style={[styles.readOnlyBar, {backgroundColor: c.surfaceMuted}]} testID="chat-room-readonly-notice">
                        <AppText variant="bodyMd" tone="secondary" center>
                            이 채팅방은 읽기 전용이에요. 지난 대화만 확인할 수 있어요.
                        </AppText>
                    </View>
                ) : (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.quickReplyRow}
                            contentContainerStyle={styles.quickReplyContent}>
                            {QUICK_REPLIES.map(reply => (
                                <Pressable
                                    key={reply}
                                    testID={`chat-quick-reply-${reply}`}
                                    accessibilityRole="button"
                                    onPress={() => handleSend(reply)}
                                    style={[styles.quickChip, {borderColor: c.borderStrong, backgroundColor: c.background}]}>
                                    <AppText variant="caption" weight="700">
                                        {reply}
                                    </AppText>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={[styles.composer, Platform.OS === 'android' ? styles.composerAndroidPad : null]}>
                            <Pressable
                                testID="chat-attach-button"
                                accessibilityRole="button"
                                accessibilityLabel="이미지 전송(준비 중)"
                                onPress={() => AppToast.show('이미지 전송은 준비 중이에요.')}
                                style={[styles.attachBtn, {borderColor: c.borderStrong}]}>
                                <Ionicons name="attach" size={18} color={c.textSecondary} />
                            </Pressable>
                            <TextInput
                                testID="chat-message-input"
                                value={draft}
                                onChangeText={setDraft}
                                placeholder="메시지 보내기"
                                placeholderTextColor={c.textTertiary}
                                style={[styles.input, {borderColor: c.borderStrong, backgroundColor: c.surfaceCanvas, color: c.textPrimary}]}
                                multiline
                                returnKeyType="send"
                                onSubmitEditing={() => handleSend(draft)}
                            />
                            <Pressable
                                testID="chat-send-button"
                                accessibilityRole="button"
                                accessibilityLabel="전송"
                                disabled={!draft.trim() || sendMutation.isPending}
                                onPress={() => handleSend(draft)}
                                style={[
                                    styles.sendBtn,
                                    {backgroundColor: draft.trim() ? recruit.primary : c.surfaceMuted},
                                ]}>
                                <Ionicons name="send" size={16} color={draft.trim() ? '#FFFFFF' : c.textTertiary} />
                            </Pressable>
                        </View>
                    </>
                )}
            </Pressable>

            <ChatReportSheet
                visible={!!reportTarget}
                onClose={() => setReportTarget(null)}
                onSubmit={handleReportSubmit}
                submitting={reportMutation.isPending}
            />
        </ScreenContainer>
    );
};

interface MessageBubbleProps {
    message: ChatMessage;
    onLongPress: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({message, onLongPress}) => {
    const c = useThemeColors();
    const mine = message.mine;

    return (
        <>
            <View style={[styles.msgRow, mine ? styles.msgRowMine : null]}>
                <Pressable
                    testID={`chat-message-bubble-${message.id}`}
                    onLongPress={mine ? undefined : onLongPress}
                    delayLongPress={350}
                    style={[
                        styles.bubble,
                        mine
                            ? [styles.bubbleMineTail, {backgroundColor: recruit.primary}]
                            : [styles.bubbleTheirsTail, {backgroundColor: c.surfaceMuted}],
                    ]}>
                    <AppText variant="bodyMd" style={{color: mine ? colors.textInverse : c.textPrimary}}>
                        {message.content}
                    </AppText>
                </Pressable>
                <View style={styles.msgMeta}>
                    <AppText variant="caption" tone="tertiary">
                        {formatMessageTime(message.sentAt)}
                    </AppText>
                    {mine ? (
                        <AppText variant="caption" style={{color: recruit.primary}}>
                            {message.readAt ? '읽음' : '전송됨'}
                        </AppText>
                    ) : null}
                </View>
            </View>
            {message.masked ? (
                <View style={[styles.maskNote, {backgroundColor: c.warningBg}]} testID={`chat-message-mask-note-${message.id}`}>
                    <AppText variant="caption" style={{color: c.warning}} center>
                        🔒 연락처는 소담 가입 전까지 자동으로 가려져요
                    </AppText>
                </View>
            ) : null}
        </>
    );
};

const styles = StyleSheet.create({
    bubbleMineTail: {borderBottomRightRadius: 4},
    bubbleTheirsTail: {borderBottomLeftRadius: 4},
    flex: {flex: 1},
    menuCard: {
        position: 'absolute',
        right: spacing.md,
        top: layout.headerHeight + spacing.xs,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingVertical: spacing.xs,
        minWidth: 168,
        zIndex: 10,
        elevation: 6,
    },
    menuRow: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2},
    jobPin: {
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: 2,
    },
    thread: {flex: 1},
    threadContent: {padding: spacing.md, gap: spacing.sm},
    daySepWrap: {alignItems: 'center', marginVertical: spacing.xs},
    daySepText: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill},
    systemMsg: {marginVertical: spacing.xs},
    msgRow: {flexDirection: 'row', gap: spacing.xs, maxWidth: '84%', alignSelf: 'flex-start', alignItems: 'flex-end'},
    msgRowMine: {alignSelf: 'flex-end', flexDirection: 'row-reverse'},
    bubble: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16},
    msgMeta: {justifyContent: 'flex-end', gap: 2},
    maskNote: {alignSelf: 'center', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, maxWidth: '90%'},
    readOnlyBar: {padding: spacing.md},
    quickReplyRow: {flexGrow: 0},
    quickReplyContent: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs},
    quickChip: {borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2},
    composer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        paddingTop: spacing.xs,
    },
    composerAndroidPad: {paddingBottom: spacing.md},
    attachBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 96,
        borderRadius: radius.pill,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm - 2,
        fontSize: 14,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ChatRoomScreen;
