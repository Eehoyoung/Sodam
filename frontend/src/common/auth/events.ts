/**
 * 세션 만료 구독 API (WP-02).
 *
 * `common/api/client.ts`가 기존에 쓰던 `setOnUnauthorized(cb)` 단일-콜백 방식을 다중 구독자로
 * 대체했다(WP-10에서 setOnUnauthorized 자체를 삭제). client.ts의 401-refresh-실패 경로가
 * `emitSessionExpired()`를 호출하고, `AuthContext.tsx`가 `subscribeSessionExpired`로 구독한다.
 */

type Listener = () => void;

let listeners: Listener[] = [];

export function subscribeSessionExpired(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => listener());
}

export const __testing__ = {
  reset: () => { listeners = []; },
  listenerCount: () => listeners.length,
};
