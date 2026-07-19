/**
 * 금액 표시 포맷 (WP-05) — `common/utils/format.ts`에서 이동. 로직은 그대로다.
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
