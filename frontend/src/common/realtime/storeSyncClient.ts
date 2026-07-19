/**
 * 실시간 인앱 동기화(STOMP over WebSocket) 클라이언트 (WP-05).
 *
 * 목적: 직원 입사·출퇴근 등 한 행위자의 변경을 같은 매장을 보는 다른 화면/기기에 즉시 반영.
 * BE LiveSyncPublisher 가 `/topic/store.{storeId}` 로 보내는 트리거를 받아 화면이 REST 재조회한다.
 * 페이로드는 신호일 뿐 — 실제 데이터/권한은 인증된 REST(BOLA 가드)에서 처리.
 *
 * 견고성:
 *  - 단일 공유 연결. 화면들이 매장별로 구독/해지.
 *  - 끊기면 @stomp/stompjs 가 자동 재연결, onConnect 에서 전 구독 복원.
 *  - 미연결/인증실패여도 앱은 정상 — useFocusEffect 재조회가 백업. (key-less, 항상 활성)
 */
import {Client, type IMessage, type StompSubscription} from '@stomp/stompjs';
import {env} from '../config/env';
import TokenManager from '../../services/TokenManager';

export interface SyncEvent {
    type: 'EMPLOYEES_CHANGED' | 'ATTENDANCE_CHANGED' | 'STORE_UPDATED' | 'PAYROLL_CHANGED' | string;
    storeId: number;
    at: string;
}

type Listener = (e: SyncEvent) => void;

const listeners = new Map<number, Set<Listener>>();
const subs = new Map<number, StompSubscription>();
let client: Client | null = null;

function wsUrl(): string {
    // http://10.0.2.2:7070 → ws://10.0.2.2:7070/ws  (https→wss 동일 규칙)
    return `${env.apiBaseUrl.replace(/^http/i, 'ws')}/ws`;
}

function ensureClient(): void {
    if (client) {
        return;
    }
    client = new Client({
        webSocketFactory: () => new WebSocket(wsUrl()),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        // CONNECT 직전에 최신 access token 을 헤더로 — 만료/갱신 후에도 유효하게.
        beforeConnect: async () => {
            const token = await TokenManager.getAccess();
            client!.connectHeaders = token ? {Authorization: `Bearer ${token}`} : {};
        },
        onConnect: () => {
            // 재연결 포함 — 현재 관심 매장 전부 재구독.
            listeners.forEach((_set, storeId) => doSubscribe(storeId));
        },
        onWebSocketClose: () => {
            // 끊기면 기존 subscription 핸들은 무효 — 비우고 재연결 시 재구독.
            subs.clear();
        },
        // 인증 실패 등 STOMP 오류는 조용히(로그아웃 상태에서도 앱이 시끄럽지 않도록).
        onStompError: () => {},
    });
    client.activate();
}

function doSubscribe(storeId: number): void {
    if (!client || !client.connected || subs.has(storeId)) {
        return;
    }
    const sub = client.subscribe(`/topic/store.${storeId}`, (msg: IMessage) => {
        try {
            const event = JSON.parse(msg.body) as SyncEvent;
            listeners.get(storeId)?.forEach(l => l(event));
        } catch {
            // malformed — 무시
        }
    });
    subs.set(storeId, sub);
}

/**
 * 매장 토픽 구독. 반환된 함수로 해지. 같은 매장에 여러 화면이 구독 가능(공유 연결).
 */
export function subscribeStore(storeId: number, listener: Listener): () => void {
    let set = listeners.get(storeId);
    if (!set) {
        set = new Set();
        listeners.set(storeId, set);
    }
    set.add(listener);

    ensureClient();
    doSubscribe(storeId); // 이미 연결돼 있으면 즉시, 아니면 onConnect 에서 복원

    return () => {
        const s = listeners.get(storeId);
        if (!s) {
            return;
        }
        s.delete(listener);
        if (s.size === 0) {
            listeners.delete(storeId);
            subs.get(storeId)?.unsubscribe();
            subs.delete(storeId);
        }
    };
}

/** 로그아웃 시 연결 종료(선택적). 다음 subscribeStore 호출 때 재연결된다. */
export function disconnectLiveSync(): void {
    listeners.clear();
    subs.clear();
    client?.deactivate();
    client = null;
}
