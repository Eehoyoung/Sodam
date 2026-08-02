import {__testing__} from '../../../src/common/api/client';
import attendanceCreditService from '../../../src/features/recruitment/services/attendanceCreditService';

// axios-mock-adapter 가 없으면 최소 폴리필 (client.test.ts / paywall402.test.ts 패턴과 동일)
let AxiosMockAdapter: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
    AxiosMockAdapter = class {
        constructor(_instance: any) {}
        onGet() {
            return {replyOnce: () => this, reply: () => this};
        }
        onPost() {
            return {replyOnce: () => this, reply: () => this};
        }
        restore() {}
    };
}

// attendanceCreditService — `AttendanceCreditController` 2개 엔드포인트(recruitment-monetization-
// gamification-plan.md §2, §5) 정합 회귀 테스트. 실제 axios 인스턴스에 HTTP 레이어를 목(mock)해
// 백엔드 DTO(AttendanceCreditSummaryResponse/AttendanceCreditCheckInResponse) 실제 응답 형태
// 그대로 파싱되는지 검증한다(화면 목데이터가 아니라 네트워크 레이어 자체를 검증).
describe('attendanceCreditService', () => {
    let mock: any;

    beforeEach(() => {
        mock = new AxiosMockAdapter(__testing__.getClient());
    });

    afterEach(() => {
        mock.restore();
    });

    it('GET /api/attendance-credits/me — 백엔드 응답 형태(balance/expiringThisWeek/currentStreak/checkedInToday/weeklyGrid)를 그대로 파싱한다', async () => {
        mock.onGet('/api/attendance-credits/me').replyOnce(200, {
            balance: 18,
            expiringThisWeek: 5,
            currentStreak: 3,
            checkedInToday: false,
            weeklyGrid: [
                {date: '2026-08-03', dayOfWeek: 'MON', checkedIn: true, isToday: false},
                {date: '2026-08-04', dayOfWeek: 'TUE', checkedIn: true, isToday: false},
                {date: '2026-08-05', dayOfWeek: 'WED', checkedIn: true, isToday: false},
                {date: '2026-08-06', dayOfWeek: 'THU', checkedIn: false, isToday: true},
                {date: '2026-08-07', dayOfWeek: 'FRI', checkedIn: false, isToday: false},
                {date: '2026-08-08', dayOfWeek: 'SAT', checkedIn: false, isToday: false},
                {date: '2026-08-09', dayOfWeek: 'SUN', checkedIn: false, isToday: false},
            ],
        });

        const result = await attendanceCreditService.getMySummary();

        expect(result.balance).toBe(18);
        expect(result.expiringThisWeek).toBe(5);
        expect(result.currentStreak).toBe(3);
        expect(result.checkedInToday).toBe(false);
        expect(result.weeklyGrid).toHaveLength(7);
        expect(result.weeklyGrid[3]).toEqual({
            date: '2026-08-06',
            dayOfWeek: 'THU',
            checkedIn: false,
            isToday: true,
        });
    });

    it('GET /api/attendance-credits/me — {data: T} 래핑 응답도 방어적으로 파싱한다', async () => {
        mock.onGet('/api/attendance-credits/me').replyOnce(200, {
            data: {
                balance: 0,
                expiringThisWeek: 0,
                currentStreak: 0,
                checkedInToday: true,
                weeklyGrid: [],
            },
        });

        const result = await attendanceCreditService.getMySummary();
        expect(result.balance).toBe(0);
        expect(result.checkedInToday).toBe(true);
    });

    it('GET /api/attendance-credits/me — 형태가 맞지 않는 응답이면 에러를 던진다', async () => {
        mock.onGet('/api/attendance-credits/me').replyOnce(200, {unexpected: true});

        await expect(attendanceCreditService.getMySummary()).rejects.toThrow(
            'Invalid attendance credit summary response',
        );
    });

    it('POST /api/attendance-credits/check-in — 평일 지급(+3), 스트릭 보너스 없음', async () => {
        mock.onPost('/api/attendance-credits/check-in').replyOnce(201, {
            grantedQuantity: 3,
            streakBonusGranted: false,
            streakBonusQuantity: 0,
            balance: 21,
            currentStreak: 4,
        });

        const result = await attendanceCreditService.checkIn();
        expect(result).toEqual({
            grantedQuantity: 3,
            streakBonusGranted: false,
            streakBonusQuantity: 0,
            balance: 21,
            currentStreak: 4,
        });
    });

    it('POST /api/attendance-credits/check-in — 7일 연속 출석 완주 보너스(+10)가 함께 지급된 응답을 그대로 반환한다', async () => {
        mock.onPost('/api/attendance-credits/check-in').replyOnce(201, {
            grantedQuantity: 5,
            streakBonusGranted: true,
            streakBonusQuantity: 10,
            balance: 37,
            currentStreak: 7,
        });

        const result = await attendanceCreditService.checkIn();
        expect(result.streakBonusGranted).toBe(true);
        expect(result.streakBonusQuantity).toBe(10);
        expect(result.balance).toBe(37);
        expect(result.currentStreak).toBe(7);
    });

    it('POST /api/attendance-credits/check-in — 이미 오늘 체크인한 경우(409)는 원본 에러를 그대로 reject 한다', async () => {
        mock.onPost('/api/attendance-credits/check-in').replyOnce(409, {
            success: false,
            errorCode: 'ALREADY_CHECKED_IN',
            message: '오늘은 이미 출석 체크를 완료했어요.',
        });

        await expect(attendanceCreditService.checkIn()).rejects.toMatchObject({
            response: {status: 409},
        });
    });
});
