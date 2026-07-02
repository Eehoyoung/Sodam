export const DATE_DIGITS_LENGTH = 8;
export const TIME_DIGITS_LENGTH = 4;
export const DATE_DIGITS_HELPER = '숫자만 입력하세요. 날짜는 8자리 숫자로 입력하세요. 예: 20260629';
export const TIME_DIGITS_HELPER = '숫자만 입력하세요. 시간은 24시간 형식 4자리 숫자로 입력하세요. 예: 1020, 2330';

export function sanitizeDateDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, DATE_DIGITS_LENGTH);
}

export function sanitizeTimeDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, TIME_DIGITS_LENGTH);
}

export function compactDateFromApi(value?: string | null): string {
    if (!value) {
        return '';
    }
    return sanitizeDateDigits(value).slice(0, DATE_DIGITS_LENGTH);
}

export function compactTimeFromApi(value?: string | null): string {
    if (!value) {
        return '';
    }
    const timePart = value.includes('T') ? value.split('T')[1] : value;
    return sanitizeTimeDigits(timePart).slice(0, TIME_DIGITS_LENGTH);
}

export function isValidDateDigits(value: string): boolean {
    if (!/^\d{8}$/.test(value)) {
        return false;
    }
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    if (month < 1 || month > 12 || day < 1) {
        return false;
    }
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidTimeDigits(value: string): boolean {
    if (!/^\d{4}$/.test(value)) {
        return false;
    }
    const hour = Number(value.slice(0, 2));
    const minute = Number(value.slice(2, 4));
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function dateDigitsToIso(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function timeDigitsToHHmm(value: string): string {
    return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
}

export function timeDigitsToHHmmss(value: string): string {
    return `${timeDigitsToHHmm(value)}:00`;
}

export function localDateTimeFromDigits(dateDigits: string, timeDigits: string): string {
    return `${dateDigitsToIso(dateDigits)}T${timeDigitsToHHmmss(timeDigits)}`;
}
