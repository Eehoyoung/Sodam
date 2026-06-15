/**
 * 표시 포맷 유틸 — 08-micro-design-final-spec.md §16.
 * 금액/시급은 우측정렬 또는 큰 카드 중앙, 타이머는 tabular numeral 권장.
 */

/** 1234567 → "1,234,567원" */
export const formatMoney = (won: number): string => `${Math.round(won).toLocaleString('ko-KR')}원`;

/** 2418000 → "241만" (요약 표기) */
export const formatCompactMoney = (won: number): string => {
    if (won >= 100000000) {
        return `${Math.floor(won / 100000000)}억`;
    }
    if (won >= 10000) {
        return `${Math.floor(won / 10000)}만`;
    }
    return won.toLocaleString('ko-KR');
};

/** 시급: 10500 → "10,500원" */
export const formatWage = (won: number): string => formatMoney(won);

/** 분 단위 → "5h 30m" */
export const formatDuration = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h <= 0) {
        return `${m}m`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/** 초 단위 → "03:12:09" (근무 타이머) */
export const formatTimer = (totalSeconds: number): string => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
};

/** Date → "2026.05.25" */
export const formatDate = (d: Date | string): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
};

/** Date → "2026년 5월" */
export const formatMonth = (d: Date | string): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};
