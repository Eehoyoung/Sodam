/**
 * 채팅 시각 표시 유틸 — 서버(Asia/Seoul) `LocalDateTime` 문자열("YYYY-MM-DDTHH:mm:ss", 오프셋 없음)을
 * `Date` 로 변환하지 않고 문자열 그대로 잘라 쓴다. `Date(...)` 로 파싱하면 기기 타임존에 따라
 * 시:분이 어긋나는데(frontend.md "시간 계산은 기기 타임존 의존 금지"), 이 값들은 이미 서버가
 * Asia/Seoul 벽시계 기준으로 내려준 문자열이라 그대로 자르는 쪽이 가장 안전하다.
 */

/** "YYYY-MM-DDTHH:mm:ss" → "HH:mm" */
export function formatMessageTime(sentAt: string): string {
    return sentAt.slice(11, 16);
}

/** "YYYY-MM-DDTHH:mm:ss" → "YYYY-MM-DD" (day-separator 그룹핑 키) */
export function messageDateKey(sentAt: string): string {
    return sentAt.slice(0, 10);
}

/**
 * 오늘 날짜 키(기기 로컬 시각 기준) — 날짜 구분선 라벨("오늘")에만 쓰는 근사치다. 근무/급여
 * 계산처럼 정확성이 중요한 값이 아니라 자정 근처 기기 타임존 오차는 허용 가능한 범위로 판단했다.
 */
export function localTodayKey(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** 날짜 구분선 라벨 — 오늘이면 "오늘", 아니면 "MM.DD"(문자열 슬라이스, Date 변환 없음). */
export function formatDaySeparatorLabel(dateKey: string, todayKey: string = localTodayKey()): string {
    if (dateKey === todayKey) {
        return '오늘';
    }
    return dateKey.slice(5).replace('-', '.');
}
