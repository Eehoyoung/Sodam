import api from '../../../common/api/client';
import type {ChatMessage, ChatReportReason, ChatRoomListItem} from '../types';

/**
 * 채용 채팅 서비스 — `ChatController`/`ChatModerationController` 정합
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * ⚠️ `api.get(url, params, config)` 시그니처 — params 를 `{params: {...}}` 로 다시 감싸면
 * 쿼리스트링이 전송되지 않는 이중래핑 함정이 있다(CLAUDE.md api-get-param-double-wrap).
 * `getMessages` 의 page/size 는 `recruitmentService.ts`의 `getStoreJobSeekers` 와 동일하게
 * params 객체를 2번째 인자에 그대로 전달한다(중첩 금지).
 */

// [API Mapping] GET /api/chat-rooms/me — 내 채팅방 목록(최신순, 차단한 상대 제외)
const getMyChatRooms = async (): Promise<ChatRoomListItem[]> => {
    const res = await api.get<ChatRoomListItem[]>('/api/chat-rooms/me');
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as ChatRoomListItem[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as ChatRoomListItem[];
    }
    return [];
};

// [API Mapping] GET /api/chat-rooms/{roomId}/messages — 오래된순 페이징(조회 시 상대 미읽음 자동 읽음처리)
const getMessages = async (roomId: number, page: number = 0, size: number = 30): Promise<ChatMessage[]> => {
    const res = await api.get<ChatMessage[]>(`/api/chat-rooms/${roomId}/messages`, {page, size});
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as ChatMessage[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as ChatMessage[];
    }
    return [];
};

// [API Mapping] POST /api/chat-rooms/{roomId}/messages — 메시지 전송(읽기전용 방이면 409)
const sendMessage = async (roomId: number, content: string): Promise<ChatMessage> => {
    const res = await api.post<ChatMessage>(`/api/chat-rooms/${roomId}/messages`, {content});
    const data: any = res.data as any;
    if (typeof data?.id === 'number') {
        return data as ChatMessage;
    }
    if (typeof data?.data?.id === 'number') {
        return data.data as ChatMessage;
    }
    throw new Error('Invalid chat message response');
};

// [API Mapping] POST /api/chat-messages/{messageId}/reports — 메시지 신고(중복 신고 409)
const reportMessage = async (messageId: number, reason: ChatReportReason): Promise<void> => {
    await api.post<void>(`/api/chat-messages/${messageId}/reports`, {reason});
};

// [API Mapping] POST /api/users/{userId}/block — 사용자 차단(멱등)
const blockUser = async (userId: number): Promise<void> => {
    await api.post<void>(`/api/users/${userId}/block`);
};

const chatService = {
    getMyChatRooms,
    getMessages,
    sendMessage,
    reportMessage,
    blockUser,
};

export default chatService;
export {getMyChatRooms, getMessages, sendMessage, reportMessage, blockUser};
