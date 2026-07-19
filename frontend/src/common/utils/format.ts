/**
 * @deprecated 구현은 `common/format/money.ts`, `common/format/dateTime.ts`로 이동했다(WP-05).
 * 이 파일은 기존 import 경로 호환을 위한 re-export 전용이다.
 * 삭제 조건(WP-10): `rg -n "common/utils/format" frontend/src` 결과가 이 파일 자신 외에 0건.
 */
export {formatMoney, formatCompactMoney, formatWage} from '../format/money';
export {parseServerDateTime, formatDuration, formatTimer, formatDate, formatMonth} from '../format/dateTime';
