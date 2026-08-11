import {Client, type IMessage, type StompSubscription} from '@stomp/stompjs';
import {env} from '../config/env';
import TokenManager from '../auth/tokenStore';
import {logger} from '../../utils/logger';

export interface SyncEvent {
    type: 'EMPLOYEES_CHANGED' | 'ATTENDANCE_CHANGED' | 'STORE_UPDATED' | 'PAYROLL_CHANGED' |
        'NOTICE_CHANGED' | 'SHIFT_CHANGED' | 'TIME_OFF_CHANGED' | string;
    storeId: number;
    at: string;
}

/**
 * 채팅방 토픽({@code /topic/chat.{chatRoomId}}) 페이로드 — `ChatMessageResponse`(BE) 구조를
 * 그대로 미러링한다(recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * 매장 토픽(`SyncEvent`)과 달리 "다시 조회하라"는 트리거가 아니라 메시지 전체를 실어 보낸다 —
 * `LiveSyncPublisher.publishChatMessage` 참고. `mine` 필드는 발행 시점에 "수신자" 관점으로
 * 고정돼 있어(발신자 자신도 같은 토픽을 구독 중이면 자신이 보낸 메시지도 `mine:false`로 받는다)
 * 구독측(`useChatLiveSync`)이 현재 로그인 사용자 id와 `senderUserId`를 비교해 재계산해야 한다.
 */
export interface ChatSyncMessage {
    id: number;
    chatRoomId: number;
    senderUserId: number | null;
    senderName: string | null;
    messageType: string;
    content: string;
    masked: boolean;
    mine: boolean;
    sentAt: string;
    readAt: string | null;
}

type Listener = (event: SyncEvent) => void;
type ChatListener = (message: ChatSyncMessage) => void;

const listeners = new Map<number, Set<Listener>>();
const subscriptions = new Map<number, StompSubscription>();
const chatListeners = new Map<number, Set<ChatListener>>();
const chatSubscriptions = new Map<number, StompSubscription>();
let client: Client | null = null;

function wsUrl(): string {
    return `${env.apiBaseUrl.replace(/^http/i, 'ws')}/ws`;
}

function subscribeRemote(storeId: number): void {
    if (!client?.connected || subscriptions.has(storeId)) { return; }
    const subscription = client.subscribe(`/topic/store.${storeId}`, (message: IMessage) => {
        try {
            const event = JSON.parse(message.body) as SyncEvent;
            listeners.get(event.storeId)?.forEach(listener => listener(event));
        } catch { /* malformed trigger */ }
    });
    subscriptions.set(storeId, subscription);
}

function subscribeChatRemote(chatRoomId: number): void {
    if (!client?.connected || chatSubscriptions.has(chatRoomId)) { return; }
    const subscription = client.subscribe(`/topic/chat.${chatRoomId}`, (message: IMessage) => {
        try {
            const payload = JSON.parse(message.body) as ChatSyncMessage;
            chatListeners.get(chatRoomId)?.forEach(listener => listener(payload));
        } catch { /* malformed payload */ }
    });
    chatSubscriptions.set(chatRoomId, subscription);
}

function ensureClient(): void {
    if (client) { return; }
    const createdClient = new Client({
        // Spring의 native STOMP endpoint와 1.2 sub-protocol을 명시적으로 협상한다.
        webSocketFactory: () => new WebSocket(wsUrl(), 'v12.stomp'),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        forceBinaryWSFrames: false,
        appendMissingNULLonIncoming: true,
        beforeConnect: async () => {
            const token = await TokenManager.getAccess();
            client!.connectHeaders = token ? {Authorization: `Bearer ${token}`} : {};
        },
        onConnect: () => {
            listeners.forEach((_value, storeId) => subscribeRemote(storeId));
            chatListeners.forEach((_value, chatRoomId) => subscribeChatRemote(chatRoomId));
        },
        onWebSocketClose: () => {
            if (client === createdClient) {
                subscriptions.clear();
                chatSubscriptions.clear();
            }
        },
        onStompError: frame => {
            if (client === createdClient) {
                logger.warn('[LiveSync] STOMP error', frame.headers.message);
            }
        },
        onWebSocketError: () => {
            if (client === createdClient) {
                logger.warn('[LiveSync] WebSocket connection failed', wsUrl());
            }
        },
    });
    client = createdClient;
    client.activate();
}

function deactivateClientWhenUnused(): void {
    if (listeners.size > 0 || chatListeners.size > 0) { return; }
    const activeClient = client;
    client = null;
    subscriptions.clear();
    chatSubscriptions.clear();
    if (activeClient) {
        activeClient.deactivate();
    }
}

export function subscribeStore(storeId: number, listener: Listener): () => void {
    const set = listeners.get(storeId) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(storeId, set);
    ensureClient();
    subscribeRemote(storeId);

    return () => {
        const current = listeners.get(storeId);
        current?.delete(listener);
        if (current?.size === 0) {
            listeners.delete(storeId);
            subscriptions.get(storeId)?.unsubscribe();
            subscriptions.delete(storeId);
        }
        deactivateClientWhenUnused();
    };
}

/**
 * 채팅방 실시간 구독(§4, Phase D) — 매장 토픽과 같은 STOMP 연결(`/ws`)을 재사용한다(신규 WS
 * 커넥션을 만들지 않는다). 채팅방 화면 진입 시 구독하고, 이탈 시 해제한다.
 */
export function subscribeChatRoom(chatRoomId: number, listener: ChatListener): () => void {
    const set = chatListeners.get(chatRoomId) ?? new Set<ChatListener>();
    set.add(listener);
    chatListeners.set(chatRoomId, set);
    ensureClient();
    subscribeChatRemote(chatRoomId);

    return () => {
        const current = chatListeners.get(chatRoomId);
        current?.delete(listener);
        if (current?.size === 0) {
            chatListeners.delete(chatRoomId);
            chatSubscriptions.get(chatRoomId)?.unsubscribe();
            chatSubscriptions.delete(chatRoomId);
        }
        deactivateClientWhenUnused();
    };
}

export function disconnectLiveSync(): void {
    listeners.clear();
    subscriptions.clear();
    chatListeners.clear();
    chatSubscriptions.clear();
    deactivateClientWhenUnused();
}
