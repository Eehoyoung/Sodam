/**
 * 채용함(§15.5 R-12) 대기중 제안의 "남은 응답시간" 표기 유틸.
 *
 * `expiresAt` 은 서버(Asia/Seoul) `LocalDateTime` 문자열(오프셋 없음)이므로 `parseServerDateTime`
 * (common/format/dateTime.ts)로 +09:00 오프셋을 명시적으로 붙여 절대 시각을 복원한다 — 기기 타임존에
 * 의존하지 않는다(frontend.md "시간 계산은 기기 타임존 의존 금지").
 */
import {parseServerDateTime} from '../../../common/format/dateTime';

/** 남은 밀리초(0 미만은 0으로 클램프). */
export function remainingMs(expiresAt: string, nowMs: number = Date.now()): number {
    return Math.max(0, parseServerDateTime(expiresAt).getTime() - nowMs);
}

/** "3시간 12분 남음" / "12분 남음" / "곧 만료" 형태로 표기. */
export function formatRemaining(expiresAt: string, nowMs: number = Date.now()): string {
    const ms = remainingMs(expiresAt, nowMs);
    if (ms <= 0) {
        return '곧 만료';
    }
    const totalMinutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) {
        return `${minutes}분 남음`;
    }
    return `${hours}시간 ${minutes}분 남음`;
}
