import {useEffect, useRef} from 'react';
import {subscribeChatRoom, type ChatSyncMessage} from './storeSyncClient';

/**
 * 채팅방 실시간 메시지 구독(§4, Phase D) — `useStoreLiveSync` 와 동일한 패턴을 채팅방 단위 토픽에
 * 그대로 복제한다. `roomId` 가 없으면(아직 방 정보를 못 불러왔으면) no-op.
 *
 * @param roomId  구독할 채팅방 id(없으면 구독하지 않음)
 * @param onMessage 새 메시지 수신 콜백(최신 클로저가 항상 호출됨 — deps 신경 불필요)
 */
export function useChatLiveSync(roomId: number | undefined, onMessage: (message: ChatSyncMessage) => void): void {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;

    useEffect(() => {
        if (!roomId) {
            return;
        }
        const unsubscribe = subscribeChatRoom(roomId, message => cbRef.current(message));
        return unsubscribe;
    }, [roomId]);
}

export default useChatLiveSync;
