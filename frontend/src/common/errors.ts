/**
 * 화면(screens)이 써도 되는 <b>오류 표현</b> 진입점.
 *
 * <p><b>왜 `common/api/error` 를 직접 쓰지 않는가</b> — WP-10 계층 경계(`.eslintrc.js`)가
 * screens 의 `common/api` 직접 import 를 금지한다. 그 규칙의 목적은 <b>화면이 API 클라이언트를
 * 직접 부르지 못하게</b> 하는 것이지, 잡은 오류를 사람이 읽을 문장으로 바꾸는 것까지 막으려는
 * 것은 아니다. 오류 표현은 화면의 정당한 관심사라 여기서 재수출한다.</p>
 *
 * <p>화면에서 `catch (e: any)` 로 받아 `e?.response?.data?.message` 를 직접 파고들지 말 것 —
 * {@code any} 는 오타(`e.reponse`)를 조용히 통과시켜 항상 기본 문구만 뜨게 만든다.
 * `catch (e: unknown)` 으로 받고 아래 함수를 쓴다.</p>
 *
 * @example
 * try { await save(); }
 * catch (e: unknown) { AppToast.error(getErrorMessage(e, '저장에 실패했어요.')); }
 */
export {getErrorMessage, toApiError, ApiError} from './api/error';
