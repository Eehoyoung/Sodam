/**
 * @deprecated 구현은 `common/realtime/useStoreLiveSync.ts`로 이동했다(WP-05). 이 파일은 기존
 * import 경로 호환을 위한 re-export 전용이다. 삭제 조건(WP-10): `rg -n "common/hooks/useStoreLiveSync"
 * frontend/src` 결과가 이 파일 자신 외에 0건.
 */
export {default, useStoreLiveSync} from '../realtime/useStoreLiveSync';
