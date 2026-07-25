import {Client, type IMessage, type StompSubscription} from '@stomp/stompjs';
import {env} from '../config/env';
import TokenManager from '../auth/tokenStore';

export interface SyncEvent {
    type: 'EMPLOYEES_CHANGED' | 'ATTENDANCE_CHANGED' | 'STORE_UPDATED' | 'PAYROLL_CHANGED' |
        'NOTICE_CHANGED' | 'SHIFT_CHANGED' | 'TIME_OFF_CHANGED' | string;
    storeId: number;
    at: string;
}

type Listener = (event: SyncEvent) => void;
const listeners = new Map<number, Set<Listener>>();
const subscriptions = new Map<number, StompSubscription>();
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

function ensureClient(): void {
    if (client) { return; }
    client = new Client({
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
        },
        onWebSocketClose: () => subscriptions.clear(),
        onStompError: frame => console.warn('[LiveSync] STOMP error', frame.headers.message),
        onWebSocketError: () => console.warn('[LiveSync] WebSocket connection failed', wsUrl()),
    });
    client.activate();
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
    };
}

export function disconnectLiveSync(): void {
    listeners.clear();
    subscriptions.clear();
    client?.deactivate();
    client = null;
}
