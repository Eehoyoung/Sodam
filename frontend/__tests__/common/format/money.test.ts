import {formatCompactMoney, formatMoney, formatWage} from '../../../src/common/format/money';

describe('common/format/money (WP-05)', () => {
  it('formatMoney: 천단위 콤마 + "원" 접미사', () => {
    expect(formatMoney(1234567)).toBe('1,234,567원');
    expect(formatMoney(0)).toBe('0원');
  });

  it('formatMoney: 소수점은 반올림한다', () => {
    expect(formatMoney(1000.6)).toBe('1,001원');
  });

  it('formatWage는 formatMoney와 동일하다', () => {
    expect(formatWage(10500)).toBe(formatMoney(10500));
  });

  it('formatCompactMoney: 1억 이상은 "억" 단위', () => {
    expect(formatCompactMoney(250_000_000)).toBe('2억');
  });

  it('formatCompactMoney: 1만 이상 1억 미만은 "만" 단위', () => {
    expect(formatCompactMoney(2_418_000)).toBe('241만');
  });

  it('formatCompactMoney: 1만 미만은 콤마 표기', () => {
    expect(formatCompactMoney(9500)).toBe('9,500');
  });
});
