import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// [Test Mapping] C-2 — 미출근 직원 "알림 보내기"가 배열 인덱스가 아니라 BE 가 내려준
// 실제 employeeId(User id)로 발송되는지 검증한다. 인덱스를 쓰면 엉뚱한 사용자에게 나간다.

const mockGetMasterStores = jest.fn();
const mockFetchTodayStats = jest.fn();
const mockPushToEmployee = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn()}),
}));

jest.mock('../../src/features/store/services/storeService', () => ({
    __esModule: true,
    default: {getMasterStores: (...a: unknown[]) => mockGetMasterStores(...a)},
}));

jest.mock('../../src/features/store/services/insightsService', () => ({
    __esModule: true,
    fetchTodayStats: (...a: unknown[]) => mockFetchTodayStats(...a),
}));

jest.mock('../../src/features/notification/services/notificationService', () => ({
    __esModule: true,
    default: {pushToEmployee: (...a: unknown[]) => mockPushToEmployee(...a)},
}));

import MissingAttendanceCenterScreen from '../../src/features/attendance/screens/MissingAttendanceCenterScreen';
import {ConfirmSheet} from '../../src/common/components/ds';

const flush = async () => {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
};

describe('MissingAttendanceCenterScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetMasterStores.mockResolvedValue([{id: 10, storeName: '소담 광교점'}]);
        // 배열 두 번째 항목 = 인덱스 1, 실제 employeeId = 502 (인덱스 오용 시 값이 갈린다)
        mockFetchTodayStats.mockResolvedValue({
            storeId: 10,
            storeName: '소담 광교점',
            pendingEmployees: [
                {employeeId: 501, name: '김직원'},
                {employeeId: 502, name: '박직원'},
            ],
        });
        mockPushToEmployee.mockResolvedValue(undefined);
    });

    it('알림 발송에 배열 인덱스가 아닌 실제 employeeId 를 사용한다', async () => {
        const confirmSpy = jest.spyOn(ConfirmSheet, 'confirm').mockImplementation(() => undefined as never);

        let renderer!: ReactTestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = ReactTestRenderer.create(<MissingAttendanceCenterScreen />);
            await flush();
        });

        const nudgeButtons = renderer.root
            .findAllByProps({label: '알림 보내기'})
            .filter((n: any) => typeof n.type === 'function' || typeof n.type === 'object');

        expect(nudgeButtons.length).toBeGreaterThanOrEqual(2);

        // 두 번째 직원(박직원, employeeId=502)에게 알림 보내기
        await act(async () => {
            nudgeButtons[nudgeButtons.length - 1].props.onPress();
            await flush();
        });

        expect(confirmSpy).toHaveBeenCalled();
        const cfg = confirmSpy.mock.calls[confirmSpy.mock.calls.length - 1][0] as any;
        expect(cfg.title).toContain('박직원');

        await act(async () => {
            await cfg.primary.onPress();
            await flush();
        });

        expect(mockPushToEmployee).toHaveBeenCalledTimes(1);
        expect(mockPushToEmployee.mock.calls[0][0]).toBe(502);

        confirmSpy.mockRestore();
    });
});
