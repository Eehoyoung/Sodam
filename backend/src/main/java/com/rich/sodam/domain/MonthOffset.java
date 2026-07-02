package com.rich.sodam.domain;

/**
 * 급여 정산 주기에서 '기준 월'에 대한 상대 월 오프셋.
 * <ul>
 *   <li>{@link #PREV_MONTH} 전월(-1) — 정산 시작일에 사용</li>
 *   <li>{@link #CURRENT_MONTH} 당월(0) — 시작/마감/지급일 공통</li>
 *   <li>{@link #NEXT_MONTH} 익월(+1) — 마감/지급일에 사용</li>
 * </ul>
 * 기준 월(payMonth)은 "급여가 지급되는 달"이 아니라 정산 사이클을 식별하는 앵커 월이다.
 */
public enum MonthOffset {
    PREV_MONTH(-1),
    CURRENT_MONTH(0),
    NEXT_MONTH(1);

    private final int delta;

    MonthOffset(int delta) {
        this.delta = delta;
    }

    public int getDelta() {
        return delta;
    }
}
