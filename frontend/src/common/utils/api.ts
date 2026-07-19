/**
 * @deprecated 구현은 `common/api/client.ts`로 이동했다 (WP-01, FE_BE_CORE_배선_리팩터링_작업계획서.md).
 * 이 파일은 기존 import 경로(`common/utils/api`) 호환을 위한 re-export 전용이며 새 로직을
 * 추가하지 않는다. 새 코드는 `common/api`(또는 `common/api/client`)에서 바로 import할 것.
 * 삭제 조건(WP-10): `rg -n "common/utils/api" frontend/src` 결과가 이 파일 자신 외에 0건.
 */
export {default, api, __testing__, setOnUnauthorized, setOnPlanRequired} from '../api/client';
export type {PlanRequiredInfo} from '../api/client';
