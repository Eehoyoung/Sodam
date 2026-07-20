import {
    applyToJobPosting,
    getMyJobApplications,
    getMyJobOffers,
    getMyJobPosting,
    getMyJobSeeking,
    getNearbyJobPostings,
    getStoreJobApplications,
    getStoreJobSeekers,
    respondToJobApplication,
    respondToJobOffer,
    sendJobOffer,
    updateMyJobSeeking,
    upsertJobPosting,
} from '../recruitmentService';
import api from '../../../../common/api/client';

jest.mock('../../../../common/api/client', () => ({
    __esModule: true,
    default: {get: jest.fn(), put: jest.fn(), post: jest.fn()},
}));

const mockedGet = api.get as jest.Mock;
const mockedPut = api.put as jest.Mock;
const mockedPost = api.post as jest.Mock;

describe('recruitmentService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getMyJobSeeking', () => {
        it('GET /api/job-seekers/me 를 호출하고 응답을 그대로 반환한다', async () => {
            const profile = {
                eligible: true,
                seeking: false,
                locations: [],
                seekingTypes: [],
                jobCategories: [],
                availability: [],
                currentEmployment: null,
            };
            mockedGet.mockResolvedValueOnce({data: profile});

            const res = await getMyJobSeeking();

            expect(mockedGet).toHaveBeenCalledWith('/api/job-seekers/me');
            expect(res).toEqual(profile);
        });

        it('{data: T} 래핑 응답도 방어적으로 파싱한다', async () => {
            const profile = {
                eligible: false,
                seeking: false,
                locations: [],
                seekingTypes: [],
                jobCategories: [],
                availability: [],
                currentEmployment: null,
            };
            mockedGet.mockResolvedValueOnce({data: {data: profile}});

            const res = await getMyJobSeeking();

            expect(res).toEqual(profile);
        });

        it('eligible 필드가 없는 비정상 응답이면 에러를 던진다', async () => {
            mockedGet.mockResolvedValueOnce({data: {}});

            await expect(getMyJobSeeking()).rejects.toThrow('Invalid job seeking profile response');
        });
    });

    describe('updateMyJobSeeking', () => {
        it('PUT /api/job-seekers/me 에 payload 를 그대로 전달한다', async () => {
            const payload = {
                seeking: true,
                locationAddresses: ['서울 중구 A', '서울 중구 B'],
                seekingTypes: ['SUBSTITUTE' as const],
                jobCategories: ['CAFE' as const],
                availability: [{day: 'MONDAY' as const, startTime: '10:00:00', endTime: '18:00:00'}],
            };
            const profile = {
                eligible: true,
                seeking: true,
                locations: [{address: '서울 중구 A'}, {address: '서울 중구 B'}],
                seekingTypes: ['SUBSTITUTE'],
                jobCategories: ['CAFE'],
                availability: payload.availability,
                currentEmployment: null,
            };
            mockedPut.mockResolvedValueOnce({data: profile});

            const res = await updateMyJobSeeking(payload);

            expect(mockedPut).toHaveBeenCalledWith('/api/job-seekers/me', payload);
            expect(res).toEqual(profile);
        });
    });

    describe('getStoreJobSeekers', () => {
        it('필터 없이 호출하면 params 없이 GET 한다', async () => {
            mockedGet.mockResolvedValueOnce({data: []});

            const res = await getStoreJobSeekers(7);

            expect(mockedGet).toHaveBeenCalledWith('/api/stores/7/job-seekers', undefined);
            expect(res).toEqual([]);
        });

        it('workType/availableOn 필터를 params 2번째 인자로 그대로 전달한다(이중 래핑 금지)', async () => {
            mockedGet.mockResolvedValueOnce({data: []});

            await getStoreJobSeekers(7, {workType: 'SUBSTITUTE', availableOn: '2026-07-13'});

            // api.get(url, params, config) — params 를 {params:{}}로 다시 감싸면 쿼리가 안 나가는
            // 이중래핑 함정이 있다(CLAUDE.md). params 는 2번째 인자에 그대로 전달해야 한다.
            expect(mockedGet).toHaveBeenCalledWith('/api/stores/7/job-seekers', {
                workType: 'SUBSTITUTE',
                availableOn: '2026-07-13',
            });
        });

        it('{data: T[]} 래핑 응답도 방어적으로 파싱하고, 비정상 응답은 빈 배열을 반환한다', async () => {
            mockedGet.mockResolvedValueOnce({data: {data: [{userId: 1}]}});
            const wrapped = await getStoreJobSeekers(7);
            expect(wrapped).toEqual([{userId: 1}]);

            mockedGet.mockResolvedValueOnce({data: null});
            const empty = await getStoreJobSeekers(7);
            expect(empty).toEqual([]);
        });
    });

    // ── Phase 6 — 매칭 왕복(제안·공고·지원) ──────────────────────────────────

    describe('sendJobOffer', () => {
        it('POST /api/stores/{storeId}/job-offers 에 payload 를 그대로 전달한다', async () => {
            const payload = {
                targetUserId: 5,
                workType: 'SUBSTITUTE' as const,
                workDate: '2026-07-13',
                startTime: '10:00:00',
                endTime: '18:00:00',
                hourlyWage: 10500,
                message: '오늘 대타 가능하실까요?',
            };
            const offer = {id: 1, storeId: 7, storeName: '소담카페', ...payload, status: 'PENDING', expiresAt: '2026-07-13T10:00:00', createdAt: '2026-07-12T10:00:00', respondedAt: null, storeCode: null};
            mockedPost.mockResolvedValueOnce({data: offer});

            const res = await sendJobOffer(7, payload);

            expect(mockedPost).toHaveBeenCalledWith('/api/stores/7/job-offers', payload);
            expect(res).toEqual(offer);
        });
    });

    describe('getMyJobOffers', () => {
        it('GET /api/job-offers/me 를 호출하고 배열을 그대로 반환한다', async () => {
            mockedGet.mockResolvedValueOnce({data: [{id: 1}]});
            const res = await getMyJobOffers();
            expect(mockedGet).toHaveBeenCalledWith('/api/job-offers/me');
            expect(res).toEqual([{id: 1}]);
        });

        it('비정상 응답은 빈 배열을 반환한다', async () => {
            mockedGet.mockResolvedValueOnce({data: null});
            expect(await getMyJobOffers()).toEqual([]);
        });
    });

    describe('respondToJobOffer', () => {
        it('PUT /api/job-offers/{offerId}/respond 에 {accept} 바디를 전달한다', async () => {
            const offer = {id: 9, status: 'ACCEPTED', storeCode: 'ST1234ABCD'};
            mockedPut.mockResolvedValueOnce({data: offer});

            const res = await respondToJobOffer(9, true);

            expect(mockedPut).toHaveBeenCalledWith('/api/job-offers/9/respond', {accept: true});
            expect(res).toEqual(offer);
        });
    });

    describe('upsertJobPosting', () => {
        it('PUT /api/stores/{storeId}/job-posting 에 payload 를 그대로 전달한다', async () => {
            const payload = {
                workType: 'REGULAR' as const,
                jobCategory: 'CAFE' as const,
                startTime: '09:00:00',
                endTime: '18:00:00',
                hourlyWage: 10000,
                open: true,
            };
            const posting = {id: 1, storeId: 7, storeName: '소담카페', ...payload, workDate: null, message: null, createdAt: '', updatedAt: ''};
            mockedPut.mockResolvedValueOnce({data: posting});

            const res = await upsertJobPosting(7, payload);

            expect(mockedPut).toHaveBeenCalledWith('/api/stores/7/job-posting', payload);
            expect(res).toEqual(posting);
        });
    });

    describe('getMyJobPosting', () => {
        it('GET /api/stores/{storeId}/job-posting 응답을 그대로 반환한다', async () => {
            const posting = {id: 1, storeId: 7};
            mockedGet.mockResolvedValueOnce({data: posting});

            const res = await getMyJobPosting(7);

            expect(mockedGet).toHaveBeenCalledWith('/api/stores/7/job-posting');
            expect(res).toEqual(posting);
        });

        it('404(ENTITY_NOT_FOUND) 이면 예외 대신 null 을 반환한다(최초 작성 폼 분기)', async () => {
            mockedGet.mockRejectedValueOnce({
                response: {status: 404, data: {errorCode: 'ENTITY_NOT_FOUND'}},
            });

            const res = await getMyJobPosting(7);

            expect(res).toBeNull();
        });

        it('그 외 에러는 그대로 던진다', async () => {
            mockedGet.mockRejectedValueOnce({response: {status: 500, data: {}}});

            await expect(getMyJobPosting(7)).rejects.toBeDefined();
        });
    });

    describe('getNearbyJobPostings', () => {
        it('필터 없이 호출하면 params 없이 GET 한다', async () => {
            mockedGet.mockResolvedValueOnce({data: []});

            await getNearbyJobPostings();

            expect(mockedGet).toHaveBeenCalledWith('/api/job-postings/nearby', undefined);
        });

        it('workType/category 필터를 params 2번째 인자로 그대로 전달한다(이중 래핑 금지)', async () => {
            mockedGet.mockResolvedValueOnce({data: []});

            await getNearbyJobPostings({workType: 'SUBSTITUTE', category: 'CAFE'});

            expect(mockedGet).toHaveBeenCalledWith('/api/job-postings/nearby', {
                workType: 'SUBSTITUTE',
                category: 'CAFE',
            });
        });
    });

    describe('applyToJobPosting', () => {
        it('POST /api/job-postings/{postingId}/applications 에 payload 를 전달한다', async () => {
            const application = {id: 1, postingId: 3, status: 'PENDING'};
            mockedPost.mockResolvedValueOnce({data: application});

            const res = await applyToJobPosting(3, {message: '지원합니다'});

            expect(mockedPost).toHaveBeenCalledWith('/api/job-postings/3/applications', {message: '지원합니다'});
            expect(res).toEqual(application);
        });
    });

    describe('getMyJobApplications', () => {
        it('GET /api/job-applications/me 를 호출한다', async () => {
            mockedGet.mockResolvedValueOnce({data: [{id: 1}]});
            const res = await getMyJobApplications();
            expect(mockedGet).toHaveBeenCalledWith('/api/job-applications/me');
            expect(res).toEqual([{id: 1}]);
        });
    });

    describe('getStoreJobApplications', () => {
        it('GET /api/stores/{storeId}/job-applications 를 호출한다', async () => {
            mockedGet.mockResolvedValueOnce({data: [{applicationId: 1}]});
            const res = await getStoreJobApplications(7);
            expect(mockedGet).toHaveBeenCalledWith('/api/stores/7/job-applications');
            expect(res).toEqual([{applicationId: 1}]);
        });
    });

    describe('respondToJobApplication', () => {
        it('PUT /api/job-applications/{id}/respond 에 {accept} 바디를 전달한다', async () => {
            const item = {applicationId: 4, status: 'ACCEPTED'};
            mockedPut.mockResolvedValueOnce({data: item});

            const res = await respondToJobApplication(4, true);

            expect(mockedPut).toHaveBeenCalledWith('/api/job-applications/4/respond', {accept: true});
            expect(res).toEqual(item);
        });
    });
});
