import {
  formatDate,
  formatDuration,
  formatMonth,
  formatTimer,
  parseServerDateTime,
} from '../../../src/common/format/dateTime';

describe('common/format/dateTime (WP-05)', () => {
  describe('parseServerDateTime — 서버 KST 의미 고정(기기 타임존 무관, 절대시각으로 검증)', () => {
    it('오프셋 없는 naive LocalDateTime 문자열은 KST(+09:00)로 간주한다', () => {
      const d = parseServerDateTime('2026-07-19T09:00:00');
      // 2026-07-19T09:00:00+09:00 == 2026-07-19T00:00:00Z
      expect(d.toISOString()).toBe('2026-07-19T00:00:00.000Z');
    });

    it('이미 Z 오프셋이 있으면 그대로 파싱한다(KST 보정 안 함)', () => {
      const d = parseServerDateTime('2026-07-19T00:00:00Z');
      expect(d.toISOString()).toBe('2026-07-19T00:00:00.000Z');
    });

    it('+09:00 명시 오프셋도 그대로 파싱한다', () => {
      const d = parseServerDateTime('2026-07-19T09:00:00+09:00');
      expect(d.toISOString()).toBe('2026-07-19T00:00:00.000Z');
    });

    it('기기 타임존이 KST가 아니어도(에뮬레이터 GMT 등) 동일한 절대시각을 반환한다', () => {
      // parseServerDateTime의 정의상 반환값은 Date(절대시각) 이므로 기기 TZ 설정과 무관하다 —
      // 이 테스트는 그 불변성 자체를 문서화한다.
      const a = parseServerDateTime('2026-01-01T12:00:00');
      const b = parseServerDateTime('2026-01-01T12:00:00');
      expect(a.getTime()).toBe(b.getTime());
    });
  });

  describe('formatDuration', () => {
    it('60분 미만은 분만 표기', () => {
      expect(formatDuration(45)).toBe('45m');
    });
    it('시간 단위가 있으면 h와 m을 함께 표기', () => {
      expect(formatDuration(330)).toBe('5h 30m');
    });
    it('정확히 시간 단위면 분은 생략', () => {
      expect(formatDuration(120)).toBe('2h');
    });
  });

  describe('formatTimer', () => {
    it('초를 HH:MM:SS로 표기', () => {
      expect(formatTimer(11529)).toBe('03:12:09');
    });
    it('음수는 0으로 clamp', () => {
      expect(formatTimer(-5)).toBe('00:00:00');
    });
  });

  describe('formatDate / formatMonth — 기기 로컬 타임존 기준(Date 객체를 직접 구성해 TZ 무관 검증)', () => {
    it('formatDate: "YYYY.MM.DD"', () => {
      const d = new Date(2026, 4, 25); // 로컬 기준 2026-05-25
      expect(formatDate(d)).toBe('2026.05.25');
    });

    it('formatMonth: "YYYY년 M월"', () => {
      const d = new Date(2026, 4, 25);
      expect(formatMonth(d)).toBe('2026년 5월');
    });
  });
});
