import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// [Test Mapping] H-6 — 출근/퇴근 CTA 에 진행중 잠금이 없어 빠른 두 번 탭에
// checkIn/checkOut 요청이 두 번 나갔다(중복 출퇴근 기록).

const mockCheckIn = jest.fn();
const mockCheckOut = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn()}),
    useFocusEffect: () => undefined,
}));

jest.mock('../../src/features/attendance/services/attendanceService', () => ({
    __esModule: true,
    default: {
        checkIn: (...a: unknown[]) => mockCheckIn(...a),
        checkOut: (...a: unknown[]) => mockCheckOut(...a),
        getAttendanceRecords: jest.fn().mockResolvedValue([]),
        getCurrentAttendance: jest.fn().mockResolvedValue(null),
        getTodayAttendance: jest.fn().mockResolvedValue(null),
    },
}));

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({user: {id: 1, name: '직원', role: 'EMPLOYEE'}}),
}));

jest.mock('../../src/features/attendance/hooks/useLocationConsentGate', () => ({
    useLocationConsentGate: () => ({ensureLocationConsent: jest.fn().mockResolvedValue(true)}),
}));

import AttendanceScreen from '../../src/features/attendance/screens/AttendanceScreen';

const fixture = {
    workplaces: [{id: '10', name: '소담 광교점'}],
    selectedWorkplaceId: '10',
    attendanceRecords: [],
    currentAttendance: null,
    checkInMethod: 'standard' as const,
    locationPermissionGranted: true,
    currentLocation: {latitude: 37.5, longitude: 127.0},
};

const flush = async () => {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
};

describe('AttendanceScreen 출퇴근 CTA 중복 탭', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // 잠금(punchingRef)은 await 이전에 동기적으로 걸리므로 지연 없이도 두 번째 탭이 막힌다.
        // 타이머로 지연시키면 그 타이머가 테스트 종료 뒤에 발화해 언마운트된 화면의 setState 를
        // 부르고, 그 잔여 작업이 --runInBand 실행의 종료 코드를 1 로 만든다.
        mockCheckIn.mockResolvedValue({
            id: 1, checkInTime: '2026-08-18T09:00:00', checkOutTime: null,
        });
    });

    it('빠르게 두 번 탭해도 checkIn 은 1번만 호출된다', async () => {
        let renderer!: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceScreen visualFixture={fixture} />);
            await flush();
        });

        const cta = renderer.root
            .findAllByProps({accessibilityRole: 'button'})
            .find((n: any) => n.props.accessibilityLabel === '출근하기');
        expect(cta).toBeTruthy();

        await act(async () => {
            cta!.props.onPress();
            cta!.props.onPress();
            await flush();
        });

        expect(mockCheckIn).toHaveBeenCalledTimes(1);

        // 마운트한 채로 끝내면 화면의 조회 비동기가 테스트 종료 뒤에 setState 를 호출하고,
        // 그 잔여 작업이 --runInBand 실행에서 jest 종료 코드를 1 로 만든다(테스트는 전부 통과인데).
        await act(async () => {
            renderer.unmount();
            await flush();
        });
    });
});
