import api from '../../../../common/utils/api';
import managerService from '../managerService';

jest.mock('../../../../common/utils/api', () => ({
    __esModule: true,
    default: {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn()},
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('managerService', () => {
    afterEach(() => jest.clearAllMocks());

    it('임명 요청에 직원과 권한 스냅샷을 함께 보낸다', async () => {
        mockedApi.post.mockResolvedValueOnce({data: {envelopeId: 71, status: 'IN_PROGRESS'}} as never);

        const result = await managerService.appointManager(3, 9, ['ATTENDANCE_APPROVE', 'STAFF_VIEW']);

        expect(mockedApi.post).toHaveBeenCalledWith('/api/stores/3/managers', {
            employeeId: 9,
            permissions: ['ATTENDANCE_APPROVE', 'STAFF_VIEW'],
        });
        expect(result.envelopeId).toBe(71);
    });

    it('위임받은 매장은 사용자 관계 기반 엔드포인트에서 조회한다', async () => {
        mockedApi.get.mockResolvedValueOnce({data: []} as never);

        await managerService.fetchManagedStores();

        expect(mockedApi.get).toHaveBeenCalledWith('/api/me/managed-stores');
    });

    it('권한 변경은 전체 권한 스냅샷을 PUT으로 보낸다', async () => {
        mockedApi.put.mockResolvedValueOnce({
            data: {signatureRequired: true, envelopeId: 72, delegationVersion: 2, permissions: ['STAFF_VIEW']},
        } as never);

        const result = await managerService.updatePermissions(3, 9, ['STAFF_VIEW']);

        expect(mockedApi.put).toHaveBeenCalledWith('/api/stores/3/managers/9', {
            permissions: ['STAFF_VIEW'],
        });
        expect(result.envelopeId).toBe(72);
    });
});
