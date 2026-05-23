/**
 * Legacy re-export — 모든 컬러 정의는 ./tokens.ts 에 통합되었다.
 * 새 코드는 `import {tokens} from '../theme/tokens'` 사용 권장.
 *
 * 기존 import 호환을 위해 동일한 형태(brandPrimary 등)로 재노출한다.
 */
import {colors as tokenColors} from './tokens';

export const colors = tokenColors;
export type Colors = typeof tokenColors;
export default tokenColors;
