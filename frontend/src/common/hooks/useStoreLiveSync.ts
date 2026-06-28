import {useEffect, useRef} from 'react';
import {subscribeStore, type SyncEvent} from '../services/liveSync';

/**
 * 주어진 매장들의 실시간 동기화 이벤트를 구독한다. 이벤트가 오면 onEvent 를 호출 —
 * 보통 화면의 재조회(loadData)를 연결한다. useFocusEffect(복귀 시 갱신)와 상호보완:
 * 이건 "화면을 보고 있는 동안" 실시간 갱신.
 *
 * @param storeIds 구독할 매장 id 들(빈 배열이면 no-op)
 * @param onEvent  이벤트 수신 콜백(최신 클로저가 항상 호출됨 — deps 신경 불필요)
 */
export function useStoreLiveSync(storeIds: number[], onEvent: (e: SyncEvent) => void): void {
    const cbRef = useRef(onEvent);
    cbRef.current = onEvent;

    // 매장 집합이 바뀔 때만 재구독(정렬해 안정적인 키 생성).
    const key = storeIds.slice().sort((a, b) => a - b).join(',');

    useEffect(() => {
        if (!key) {
            return;
        }
        const ids = key.split(',').map(Number);
        const unsubs = ids.map(id => subscribeStore(id, e => cbRef.current(e)));
        return () => unsubs.forEach(u => u());
    }, [key]);
}

export default useStoreLiveSync;
