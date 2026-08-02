import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError} from '../../../common/query/errorHandler';
import chatService from '../services/chatService';
import type {ChatMessage, ChatReportReason, ChatRoomListItem} from '../types';

/** 채용 채팅(chat) 쿼리 키 — feature가 직접 소유(WP-05 2단계 패턴, `recruitmentQueryKeys` 와 동일). */
export const chatQueryKeys = {
    all: ['chat'] as const,
    rooms: () => [...chatQueryKeys.all, 'rooms'] as const,
    messages: (roomId: number) => [...chatQueryKeys.all, 'messages', roomId] as const,
};

/** 내 채팅방 목록 — GET /api/chat-rooms/me (새 메시지 도착 시 화면에서 invalidate) */
export const useMyChatRooms = () =>
    useQuery({
        queryKey: chatQueryKeys.rooms(),
        queryFn: async (): Promise<ChatRoomListItem[]> => {
            try {
                return await chatService.getMyChatRooms();
            } catch (error) {
                handleQueryError(error, 'getMyChatRooms');
                throw error;
            }
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '채팅방 목록을 가져오는데 실패했어요.'},
    });

/** 채팅방 메시지 목록 — GET /api/chat-rooms/{roomId}/messages (오래된순, 조회 시 자동 읽음처리) */
export const useChatMessages = (roomId: number | undefined) =>
    useQuery({
        queryKey: chatQueryKeys.messages(roomId ?? -1),
        queryFn: async (): Promise<ChatMessage[]> => {
            try {
                return await chatService.getMessages(roomId as number, 0, 50);
            } catch (error) {
                handleQueryError(error, 'getMessages');
                throw error;
            }
        },
        enabled: !!roomId,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '메시지를 가져오는데 실패했어요.'},
    });

/**
 * 메시지 전송 — POST /api/chat-rooms/{roomId}/messages. 응답으로 받은 메시지(mine=true)를
 * 캐시에 낙관적으로 즉시 추가하고, 방 목록(마지막 메시지 미리보기)도 함께 무효화한다.
 */
export const useSendChatMessage = (roomId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (content: string): Promise<ChatMessage> => {
            try {
                return await chatService.sendMessage(roomId, content);
            } catch (error) {
                handleQueryError(error, 'sendMessage');
                throw error;
            }
        },
        onSuccess: sent => {
            queryClient.setQueryData<ChatMessage[]>(chatQueryKeys.messages(roomId), prev =>
                mergeIncomingChatMessage(prev, sent),
            );
            queryClient.invalidateQueries({queryKey: chatQueryKeys.rooms()});
        },
        meta: {errorMessage: '메시지를 보내지 못했어요.'},
    });
};

/** 메시지 신고 — POST /api/chat-messages/{messageId}/reports (동일 메시지 중복 신고 409) */
export const useReportChatMessage = () =>
    useMutation({
        mutationFn: async (vars: {messageId: number; reason: ChatReportReason}): Promise<void> => {
            try {
                await chatService.reportMessage(vars.messageId, vars.reason);
            } catch (error) {
                handleQueryError(error, 'reportMessage');
                throw error;
            }
        },
        meta: {errorMessage: '신고를 접수하지 못했어요.'},
    });

/** 사용자 차단 — POST /api/users/{userId}/block (성공 시 방 목록에서 즉시 제외되도록 invalidate) */
export const useBlockChatUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: number): Promise<void> => {
            try {
                await chatService.blockUser(userId);
            } catch (error) {
                handleQueryError(error, 'blockUser');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: chatQueryKeys.rooms()});
        },
        meta: {errorMessage: '차단하지 못했어요.'},
    });
};

/**
 * 실시간 수신 메시지를 캐시에 병합한다(중복 id 무시, 시각순 정렬 유지) — `ChatRoomScreen` 의
 * `useChatLiveSync` 콜백에서 사용. WS 페이로드의 `mine` 은 발행 시점(수신자 관점)에 고정돼 있어
 * 신뢰하지 않고, 호출측이 `currentUserId` 와 `senderUserId` 를 비교해 넘겨준 값을 그대로 쓴다.
 */
export function mergeIncomingChatMessage(prev: ChatMessage[] | undefined, incoming: ChatMessage): ChatMessage[] {
    const list = prev ?? [];
    if (list.some(m => m.id === incoming.id)) {
        return list;
    }
    return [...list, incoming].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}
