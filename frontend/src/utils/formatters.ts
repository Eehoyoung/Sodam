/**
 * Formats a number as a currency string in Korean won (₩)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Formats a date string to a localized format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
    // Use UTC to avoid timezone-induced date shifting in tests and consistent formatting
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
};

/**
 * Formats a time string (HH:MM) to a more readable format
 * @param timeString - Time string in HH:MM format
 * @returns Formatted time string
 */
export const formatTime = (timeString: string | null): string => {
    if (!timeString) return '-';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? '오후' : '오전';
    const hour12 = hour % 12 || 12;

    return `${ampm} ${hour12}:${minutes}`;
};
