import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

const mockRequestMutate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: jest.fn()}),
    useRoute: () => ({params: {envelopeId: 71}}),
    useFocusEffect: jest.fn(),
}));

jest.mock('../../../src/features/electronicSignature/hooks/useElectronicSignature', () => ({
    useElectronicSignature: () => ({
        data: {
            id: 71,
            subjectType: 'MANAGER_DELEGATION',
            subjectId: 8,
            storeId: 3,
            documentVersion: 1,
            documentSha256: 'a'.repeat(64),
            status: 'IN_PROGRESS',
            currentSigningOrder: 1,
            viewerPartyOrder: 1,
            parties: [
                {role: 'OWNER', order: 1, status: 'REQUEST_QUEUED'},
                {role: 'MANAGER', order: 2, status: 'WAITING'},
            ],
        },
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: mockRefetch,
    }),
    useRequestElectronicSignature: () => ({mutate: mockRequestMutate, isPending: false}),
    useRefreshElectronicSignature: () => ({mutate: jest.fn(), isPending: false}),
}));

import ElectronicSignScreen from '../../../src/features/electronicSignature/screens/ElectronicSignScreen';

describe('ElectronicSignScreen', () => {
    beforeEach(() => jest.clearAllMocks());

    it('고정 문서 버전과 서명 순서를 표시하고 서버 요청만 시작한다', () => {
        const screen = render(<ElectronicSignScreen />);

        expect(screen.getByText('문서 버전 1 · SHA-256 aaaaaaaaaa…aaaaaaaa')).toBeTruthy();
        expect(screen.getByText('1. 사업주')).toBeTruthy();
        expect(screen.getByText('2. 매니저')).toBeTruthy();
        fireEvent.press(screen.getByText('전자서명 요청 보내기'));
        expect(mockRequestMutate).toHaveBeenCalledTimes(1);
    });
});
