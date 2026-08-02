/**
 * 대타(SUBSTITUTE) 공고의 근무일(workDate) 기준 "마감 임박" 배지 계산.
 *
 * v1 DTO(`JobPosting`/`JobPostingNearbyItem`)에는 지원 마감일 필드 자체가 없다 — 정기(REGULAR)
 * 공고는 특정 근무일 개념도 없어(workDate=null) 이 계산 대상에서 제외한다. 대타 공고는 근무일이
 * 곧 실질적 "마감"이므로(그날이 지나면 의미가 없어짐) 그 날짜를 임박도 기준으로 재사용한다 —
 * 없는 데이터를 새로 만들지 않고 이미 있는 workDate로 손실회피 배지(§6.1 "소멸·마감 임박 배너")를
 * 구현하는 실용적 선택.
 *
 * 날짜 비교는 기기 타임존에 의존하지 않는다(frontend.md) — 오늘 날짜를 `Intl.DateTimeFormat`
 * `timeZone: 'Asia/Seoul'`로 명시 계산하고, 두 날짜 모두 UTC 자정 앵커로 변환해 순수 캘린더일
 * 차이만 구한다(시각 성분을 완전히 배제해 DST 등 이슈가 없다 — 한국은 DST 미적용이지만 원칙 준수).
 */

/** 오늘 날짜(Asia/Seoul) — "YYYY-MM-DD". */
function todayKstIso(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/** "YYYY-MM-DD" 두 캘린더 날짜의 차이(일 단위, workDate - today). */
export function daysUntilDate(dateIso: string, todayIso: string = todayKstIso()): number {
    const target = Date.parse(`${dateIso}T00:00:00Z`);
    const today = Date.parse(`${todayIso}T00:00:00Z`);
    return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

/**
 * 대타 공고 근무일까지 D-2 이내(당일 포함)면 "마감 D-N" 문구를 반환, 아니면 null.
 * 정기 공고(workDate=null)나 이미 지난 날짜는 대상이 아니다.
 */
export function postingUrgencyLabel(workType: 'SUBSTITUTE' | 'REGULAR', workDate: string | null): string | null {
    if (workType !== 'SUBSTITUTE' || !workDate) {
        return null;
    }
    const d = daysUntilDate(workDate);
    if (d < 0 || d > 2) {
        return null;
    }
    return d === 0 ? '오늘 마감' : `마감 D-${d}`;
}
