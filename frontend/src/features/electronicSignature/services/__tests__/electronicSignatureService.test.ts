import api from '../../../../common/utils/api';
import electronicSignatureService from '../electronicSignatureService';

jest.mock('../../../../common/utils/api', () => ({
    __esModule: true,
    default: {get: jest.fn(), post: jest.fn()},
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('electronicSignatureService', () => {
    afterEach(() => jest.clearAllMocks());

    it('서명 상태는 서버 envelope만 조회한다', async () => {
        mockedApi.get.mockResolvedValueOnce({data: {id: 12}} as never);

        await electronicSignatureService.getEnvelope(12);

        expect(mockedApi.get).toHaveBeenCalledWith('/api/e-sign/envelopes/12');
    });

    it('복귀 시 완료값을 직접 쓰지 않고 서버 refresh를 요청한다', async () => {
        mockedApi.post.mockResolvedValueOnce({data: undefined} as never);

        await electronicSignatureService.refresh(12);

        expect(mockedApi.post).toHaveBeenCalledWith('/api/e-sign/envelopes/12/refresh');
    });
});
