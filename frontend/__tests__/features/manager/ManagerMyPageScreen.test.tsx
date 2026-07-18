import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
    useFocusEffect: jest.fn(),
}));

jest.mock('../../../src/features/manager/hooks/useManagedStores', () => ({
    useManagedStores: () => ({
        data: [{
            storeId: 3,
            storeName: '소담 강남점',
            permissions: ['ATTENDANCE_APPROVE', 'STAFF_VIEW'],
            delegationVersion: 1,
            acceptedAt: null,
            signatureEnvelopeId: 71,
            signatureStatus: 'IN_PROGRESS',
            active: false,
        }],
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: mockRefetch,
    }),
}));

import ManagerMyPageScreen from '../../../src/features/myPage/screens/ManagerMyPageScreen';

describe('ManagerMyPageScreen', () => {
    beforeEach(() => jest.clearAllMocks());

    it('관계 기반 위임 현황을 표시하고 envelope ID로 서명 화면에 이동한다', () => {
        const screen = render(<ManagerMyPageScreen />);

        expect(screen.getByText('소담 강남점')).toBeTruthy();
        expect(screen.getByText('출퇴근 승인')).toBeTruthy();
        fireEvent.press(screen.getByText('전자서명 확인'));
        expect(mockNavigate).toHaveBeenCalledWith('ElectronicSign', {envelopeId: 71});
    });
});
