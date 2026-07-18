/**
 * 채용 제안 작성 시트(`JobOfferComposeSheet`, §15.5 R-11) 프리필 유틸.
 *
 * "오늘/내일" 은 UX 상 기본값을 제안하는 용도일 뿐 근무·급여 확정 로직이 아니므로(사용자가 항상
 * 편집·확인 가능), `shiftService.ts` 의 `todayIso`/`addDays` 와 동일하게 기기 로컬 날짜를 기준으로
 * 계산한다 — 타이머/근무중 상태처럼 서버 진실을 대체하는 값이 아니라는 점에서 frontend.md 의
 * "시간 계산은 기기 타임존 의존 금지" 규칙이 겨냥하는 대상과는 다르다(순수 폼 기본값 제안).
 */
import type {JobAvailabilityDay, JobDayOfWeek} from '../types';

const JS_DAY_TO_JOB_DAY: JobDayOfWeek[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
];

export function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export interface DateWithDay {
    iso: string;
    day: JobDayOfWeek;
}

/** 기준일(now)에서 n일 뒤의 날짜/요일. */
export function addDaysWithDay(now: Date, days: number): DateWithDay {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + days);
    return {iso: toIsoDate(d), day: JS_DAY_TO_JOB_DAY[d.getDay()]};
}

export type WorkDateOption = 'TODAY' | 'TOMORROW';

/** 대타 제안 근무일 기본값(오늘/내일) — §15.5 R-11. */
export function resolveWorkDateOption(option: WorkDateOption, now: Date = new Date()): DateWithDay {
    return addDaysWithDay(now, option === 'TODAY' ? 0 : 1);
}

/** 정기 제안은 근무일이 없으므로(§15.2 workDate NULL 허용) 오늘 요일을 프리필 기준으로 사용한다. */
export function resolveDefaultDay(now: Date = new Date()): JobDayOfWeek {
    return addDaysWithDay(now, 0).day;
}

/** 구직자의 요일별 가능시간에서 해당 요일 항목을 찾는다(없으면 null — 프리필 생략). */
export function findAvailabilityForDay(
    availability: JobAvailabilityDay[],
    day: JobDayOfWeek,
): JobAvailabilityDay | null {
    return availability.find(a => a.day === day) ?? null;
}
