/**
 * 시간/날짜 표시 포맷 (WP-05) — `common/utils/format.ts`에서 이동. 로직은 그대로다.
 * 08-micro-design-final-spec.md §16, 타이머는 tabular numeral 권장.
 */

/**
 * 서버가 내려주는 datetime 문자열을 안전하게 파싱한다(서버 KST 의미 고정).
 * 이미 timezone 오프셋('Z' 또는 '+HH:MM'/'-HH:MM')이 있으면 그대로 파싱하고,
 * 없으면(레거시 naive LocalDateTime 응답) 한국시간(KST, UTC+9)으로 간주해 오프셋을 붙여 파싱한다.
 * 소담은 한국 국내 서비스이고 서버는 KST 기준으로 시각을 기록하므로, 기기 타임존이
 * KST가 아니어도(예: 에뮬레이터 GMT 설정) 항상 올바른 절대시각을 계산하기 위함.
 */
export const parseServerDateTime = (value: string): Date => {
    const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
    return new Date(hasOffset ? value : `${value}+09:00`);
};

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

/**
 * Date → "2026.05.25" — 기기 로컬 타임존 기준(주의: 서버 KST 문자열을 그대로 넘기면 기기가
 * KST가 아닐 때 날짜가 하루 어긋날 수 있다. 서버 응답이면 먼저 parseServerDateTime으로 변환할 것).
 */
export const formatDate = (d: Date | string): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
};

/** Date → "2026년 5월" — 기기 로컬 타임존 기준(formatDate와 동일 주의사항). */
export const formatMonth = (d: Date | string): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};
