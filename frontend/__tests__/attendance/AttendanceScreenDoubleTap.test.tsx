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
        // 응답을 지연시켜 "요청이 아직 진행 중인" 창을 만든다.
        mockCheckIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
            id: 1, checkInTime: '2026-08-18T09:00:00', checkOutTime: null,
        }), 50)));
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
    });
});
