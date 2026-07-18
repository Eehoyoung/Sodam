/**
 * 요일별 근무가능 시간 표기 유틸 — 260711_작업통합.md Part 2 §7.4 카드 요약
 * ("월·수 10~18 · 토 18~22") 및 §7.4-2 상세 화면(요일별 리스트) 공용.
 */
import {compactTimeFromApi} from '../../../common/utils/dateTimeInput';
import {JOB_DAY_LABELS_KO, JOB_DAY_ORDER, JobAvailabilityDay, JobDayOfWeek} from '../types';

/** "10:00:00" → "10", "10:30:00" → "10:30" (분이 0이면 생략, 시안 예시 형식). */
export function formatHourLabel(time: string): string {
    const digits = compactTimeFromApi(time);
    if (digits.length !== 4) {
        return '';
    }
    const hour = String(Number(digits.slice(0, 2)));
    const minute = digits.slice(2, 4);
    return minute === '00' ? hour : `${hour}:${minute}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
    const start = formatHourLabel(startTime);
    const end = formatHourLabel(endTime);
    if (!start || !end) {
        return '';
    }
    return `${start}~${end}`;
}

/**
 * 같은 시간대(start-end)를 쓰는 요일끼리 묶어 "월·수 10~18 · 토 18~22" 형태로 요약한다.
 * 리스트 카드(§7.4)에서 사용 — 상세 화면(§7.4-2)은 요일별로 개별 행을 렌더한다.
 */
export function summarizeAvailability(availability: JobAvailabilityDay[]): string {
    if (!availability || availability.length === 0) {
        return '';
    }
    const byDayOrder = [...availability].sort(
        (a, b) => JOB_DAY_ORDER.indexOf(a.day) - JOB_DAY_ORDER.indexOf(b.day),
    );

    const groupOrder: string[] = [];
    const groups = new Map<string, JobDayOfWeek[]>();
    byDayOrder.forEach(entry => {
        const key = `${entry.startTime}-${entry.endTime}`;
        if (!groups.has(key)) {
            groups.set(key, []);
            groupOrder.push(key);
        }
        groups.get(key)!.push(entry.day);
    });

    return groupOrder
        .map(key => {
            const days = groups.get(key) ?? [];
            const [start, end] = key.split('-');
            const dayLabel = days.map(d => JOB_DAY_LABELS_KO[d]).join('·');
            return `${dayLabel} ${formatTimeRange(start, end)}`;
        })
        .join(' · ');
}

/** km 단위 소수 1자리 거리 표기(§7.4) — 1000m 미만도 km로 통일 표기. */
export function formatDistanceKm(distanceMeters: number): string {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
}
