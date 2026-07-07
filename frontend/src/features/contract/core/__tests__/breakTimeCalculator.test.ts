import {
    autoBreakDigitsFromTimeDigits,
    autoBreakWindowMinutes,
    requiredBreakMinutes,
} from '../breakTimeCalculator';

describe('breakTimeCalculator (근로기준법 §54 법정 최소 휴게 자동 산출)', () => {
    it('4시간 미만은 법정 휴게 의무가 없다(0분)', () => {
        expect(requiredBreakMinutes(3 * 60 + 59)).toBe(0);
    });

    it('정확히 4시간이면 30분 이상 휴게가 필요하다(경계값)', () => {
        expect(requiredBreakMinutes(4 * 60)).toBe(30);
    });

    it('4~8시간 사이는 30분 휴게가 필요하다', () => {
        expect(requiredBreakMinutes(6 * 60)).toBe(30);
        expect(requiredBreakMinutes(8 * 60 - 1)).toBe(30);
    });

    it('정확히 8시간이면 60분 이상 휴게가 필요하다(경계값)', () => {
        expect(requiredBreakMinutes(8 * 60)).toBe(60);
    });

    it('8시간 초과는 60분 휴게가 필요하다', () => {
        expect(requiredBreakMinutes(11 * 60)).toBe(60);
    });

    it('11:00~22:00(11시간) 근무는 60분 휴게를 근무 정중앙(16:00~17:00)에 자동 배치한다', () => {
        const window = autoBreakWindowMinutes(11 * 60, 22 * 60);
        expect(window).toEqual({breakStartMinutes: 16 * 60, breakEndMinutes: 17 * 60});
    });

    it('4시간 미만 근무는 자동 휴게를 배치하지 않는다', () => {
        expect(autoBreakWindowMinutes(9 * 60, 12 * 60)).toBeNull();
    });

    it('자정을 넘기는 야간 시프트(20:00~05:00, 9시간)도 근무 구간 도중에 60분 휴게를 배치한다', () => {
        const window = autoBreakWindowMinutes(20 * 60, 5 * 60);
        // 9시간 근무의 정중앙 60분 = 20:00 + 240분 = 00:00 ~ 01:00
        expect(window).toEqual({breakStartMinutes: 0, breakEndMinutes: 60});
    });

    describe('autoBreakDigitsFromTimeDigits (4자리 숫자 입력 자동입력)', () => {
        it('출퇴근 시각이 완전하면 휴게 시작·종료를 4자리 숫자로 자동 산출한다', () => {
            expect(autoBreakDigitsFromTimeDigits('1100', '2200')).toEqual({
                breakStart: '1600',
                breakEnd: '1700',
            });
        });

        it('입력이 아직 4자리가 아니면 null(자동입력 보류)', () => {
            expect(autoBreakDigitsFromTimeDigits('110', '2200')).toBeNull();
            expect(autoBreakDigitsFromTimeDigits('1100', '')).toBeNull();
        });

        it('4시간 미만 근무는 null(휴게 입력란을 비워 둔다)', () => {
            expect(autoBreakDigitsFromTimeDigits('0900', '1200')).toBeNull();
        });
    });
});
