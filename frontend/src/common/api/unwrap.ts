/**
 * BE 응답 정규화 (WP-01) — F-02: 서비스마다 res.data / res.data.data / 배열 여부를
 * 제각각 해석하던 방어적 unwrap 로직을 한 곳으로 모은다.
 *
 * envelope({success, data, ...})면 data를 꺼내고, 이미 순수 payload면 그대로 반환한다.
 * 어느 쪽인지는 "success와 data 필드를 동시에 가진 object인가"로 판별한다 — 순수 payload가
 * 우연히 이 두 필드를 함께 가지는 경우는 이 코드베이스에 없다(도메인 DTO 어디에도 결합 없음).
 */
import type {ApiEnvelope} from './types';

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return (
    !!payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'success' in payload &&
    'data' in payload
  );
}

export function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }
  return payload;
}
