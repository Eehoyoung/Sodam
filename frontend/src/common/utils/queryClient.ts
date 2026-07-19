/**
 * @deprecated queryClient 인스턴스는 `common/query/client.ts`, 오류 처리는
 * `common/query/errorHandler.ts`로 이동했다(WP-05 2단계). 도메인별 query key factory
 * (`queryKeys.auth`/`.attendance`/`.salary`/`.store`/`.recruitment`)는 각 기능이 직접
 * 소유하도록 분리했다 — `common/auth/queryKeys.ts`(authQueryKeys), 그리고 각
 * `features/*\/hooks/use*Queries.ts` 파일 상단의 `<도메인>QueryKeys` export를 참고할 것.
 * `info`/`qna` 네임스페이스는 실제로 어떤 쿼리 훅도 사용하지 않던 죽은 코드라 이관 없이 삭제했다.
 * 이 파일은 기존 import 경로(`common/utils/queryClient`) 호환을 위한 re-export 전용이며 새 로직을
 * 추가하지 않는다. 삭제 조건(WP-10): `rg -n "common/utils/queryClient" frontend/src` 결과가
 * 이 파일 자신 외에 0건.
 */
export {queryClient} from '../query/client';
export {handleQueryError} from '../query/errorHandler';
