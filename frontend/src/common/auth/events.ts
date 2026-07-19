/**
 * 세션 만료 구독 API (WP-02).
 *
 * `common/api/client.ts`의 기존 `setOnUnauthorized(cb)` 단일-콜백 방식을 다중 구독자로
 * 확장하기 위한 새 인프라. 이번 증분에서는 아직 client.ts의 실패 경로에 연결하지 않았다
 * (기존 setOnUnauthorized 계약을 보호하는 api.test.ts 테스트를 이번 패스에서 건드리지 않기
 * 위한 의도적 결정 — AuthContext.tsx를 subscribeSessionExpired로 전환하는 작업은 후속 증분).
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
