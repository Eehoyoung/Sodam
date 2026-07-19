import homeService from '../homeService';
import {api} from '../../../../common/api';

jest.mock('../../../../common/api', () => ({
    __esModule: true,
    api: {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn()},
    unwrapData: jest.requireActual('../../../../common/api/unwrap').unwrapData,
}));

const mockedGet = api.get as jest.Mock;

describe('homeService — WP-03: raw axios(/api/v1/*) → common/api(실제 BE 경로) 전환', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('fetchEvents는 GET /api/campaigns/active 를 호출하고 캠페인을 Event로 매핑한다', async () => {
        mockedGet.mockResolvedValueOnce({
            data: [{key: 'vat-q2', title: '부가세 신고 안내', message: '7월 25일까지 신고하세요.', deepLink: 'sodam://tax'}],
        });

        const events = await homeService.fetchEvents();

        expect(mockedGet).toHaveBeenCalledWith('/api/campaigns/active');
        expect(events).toEqual([
            {id: 'vat-q2', title: '부가세 신고 안내', description: '7월 25일까지 신고하세요.', date: '', url: 'sodam://tax'},
        ]);
    });

    it('fetchLaborInfo는 GET /api/labor-info 를 호출하고 BE 필드(imagePath/createdAt)를 FE 형태로 매핑한다', async () => {
        mockedGet.mockResolvedValueOnce({
            data: [{id: 7, title: '최저임금 안내', content: '2026년 최저임금은...', imagePath: '/img/1.png', createdAt: '2026-01-01T00:00:00'}],
        });

        const items = await homeService.fetchLaborInfo();

        expect(mockedGet).toHaveBeenCalledWith('/api/labor-info');
        expect(items).toEqual([{
            id: '7',
            title: '최저임금 안내',
            description: '2026년 최저임금은...',
            content: '2026년 최저임금은...',
            date: '2026-01-01T00:00:00',
            category: '',
            imageUrl: '/img/1.png',
        }]);
    });

    it('fetchPolicies는 GET /api/policy-info 를 호출한다', async () => {
        mockedGet.mockResolvedValueOnce({data: []});
        await homeService.fetchPolicies();
        expect(mockedGet).toHaveBeenCalledWith('/api/policy-info');
    });

    it('fetchTaxInfo는 GET /api/tax-info 를 호출한다', async () => {
        mockedGet.mockResolvedValueOnce({data: []});
        await homeService.fetchTaxInfo();
        expect(mockedGet).toHaveBeenCalledWith('/api/tax-info');
    });

    it('fetchTips는 GET /api/tip-info 를 호출한다', async () => {
        mockedGet.mockResolvedValueOnce({data: []});
        await homeService.fetchTips();
        expect(mockedGet).toHaveBeenCalledWith('/api/tip-info');
    });

    it('envelope({success,data}) 응답도 정규화해서 처리한다(unwrapData)', async () => {
        mockedGet.mockResolvedValueOnce({
            data: {success: true, data: [{id: 1, title: 't', content: 'c'}]},
        });

        const items = await homeService.fetchTaxInfo();

        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('t');
    });

    it('BE 호출이 실패하면 그대로 reject한다(부분 실패 — 화면단 재시도 버튼과 연동)', async () => {
        mockedGet.mockRejectedValueOnce(new Error('Network Error'));

        await expect(homeService.fetchPolicies()).rejects.toThrow('Network Error');
    });

    it('fetchTestimonials/getServices는 G-1 기본 처분에 따라 BE 호출 없이 항상 실패한다(신규 API 미생성)', async () => {
        await expect(homeService.fetchTestimonials()).rejects.toThrow('TESTIMONIALS_NOT_IMPLEMENTED');
        await expect(homeService.getServices()).rejects.toThrow('SERVICES_NOT_IMPLEMENTED');
        expect(mockedGet).not.toHaveBeenCalled();
    });
});
