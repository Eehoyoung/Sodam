import api from '../../../common/utils/api';
import type {
    JobApplicantListItem,
    JobApplication,
    JobApplicationCreatePayload,
    JobOffer,
    JobOfferCreatePayload,
    JobPosting,
    JobPostingNearbyFilters,
    JobPostingNearbyItem,
    JobPostingUpsertPayload,
    JobSeekerListFilters,
    JobSeekerListItem,
    JobSeekingProfile,
    JobSeekingUpdatePayload,
} from '../types';

/**
 * 인증채용(구직) 서비스 — `JobSeekerController` 3개 엔드포인트 정합
 * (260711_작업통합.md Part 2 §5·§7.2).
 *
 * ⚠️ `api.get(url, params, config)` 시그니처 — params 를 `{params: {...}}` 로 다시 감싸면
 * 쿼리스트링이 전송되지 않는 이중래핑 함정이 있다(CLAUDE.md api-get-param-double-wrap).
 * `getMyJobSeeking`/`updateMyJobSeeking` 은 쿼리 파라미터가 없어 함정 자체는 회피되지만,
 * `getStoreJobSeekers` 의 workType/availableOn 필터는 `storeService.ts`/`certificateService.ts`
 * 와 동일하게 params 객체를 2번째 인자에 그대로 전달한다(중첩 금지).
 */

// [API Mapping] GET /api/job-seekers/me — 내 구직 프로필 조회(자격/현재소속 포함, 프로필 없으면 기본값)
const getMyJobSeeking = async (): Promise<JobSeekingProfile> => {
    const res = await api.get<JobSeekingProfile>('/api/job-seekers/me');
    const data: any = res.data as any;
    // 방어적 파싱(storeService.ts 패턴) — 일부 백엔드가 {data: T} 래핑일 수 있음
    if (typeof data?.eligible === 'boolean') {
        return data as JobSeekingProfile;
    }
    if (typeof data?.data?.eligible === 'boolean') {
        return data.data as JobSeekingProfile;
    }
    throw new Error('Invalid job seeking profile response');
};

// [API Mapping] PUT /api/job-seekers/me — 구직 상태/희망지역/유형/업종/근무가능시간 부분 업데이트
const updateMyJobSeeking = async (payload: JobSeekingUpdatePayload): Promise<JobSeekingProfile> => {
    const res = await api.put<JobSeekingProfile>('/api/job-seekers/me', payload);
    const data: any = res.data as any;
    if (typeof data?.eligible === 'boolean') {
        return data as JobSeekingProfile;
    }
    if (typeof data?.data?.eligible === 'boolean') {
        return data.data as JobSeekingProfile;
    }
    throw new Error('Invalid job seeking profile response');
};

// [API Mapping] GET /api/stores/{storeId}/job-seekers — 매장 반경 4km 구직자 리스트(사장 전용, BOLA: StoreAccessGuard)
const getStoreJobSeekers = async (
    storeId: number,
    filters?: JobSeekerListFilters,
): Promise<JobSeekerListItem[]> => {
    const params: Record<string, string> = {};
    if (filters?.workType) {
        params.workType = filters.workType;
    }
    if (filters?.availableOn) {
        params.availableOn = filters.availableOn;
    }
    const hasParams = Object.keys(params).length > 0;
    const res = await api.get<JobSeekerListItem[]>(
        `/api/stores/${storeId}/job-seekers`,
        hasParams ? params : undefined,
    );
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as JobSeekerListItem[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as JobSeekerListItem[];
    }
    return [];
};

/**
 * Phase 6 — 매칭 왕복(제안·공고·지원) API. `JobOfferController`/`JobPostingController`/
 * `JobApplicationController` 3개 컨트롤러와 1:1 정합(260711_작업통합.md Part 2 §15.3·§19.3).
 * 방어적 파싱·이중래핑 회피는 위 3개 함수와 동일 패턴을 그대로 따른다.
 */

// [API Mapping] POST /api/stores/{storeId}/job-offers — 채용 제안 발송(사장 전용, BOLA: StoreAccessGuard)
const sendJobOffer = async (storeId: number, payload: JobOfferCreatePayload): Promise<JobOffer> => {
    const res = await api.post<JobOffer>(`/api/stores/${storeId}/job-offers`, payload);
    const data: any = res.data as any;
    if (typeof data?.id === 'number') {
        return data as JobOffer;
    }
    if (typeof data?.data?.id === 'number') {
        return data.data as JobOffer;
    }
    throw new Error('Invalid job offer response');
};

// [API Mapping] GET /api/job-offers/me — 내가 받은 채용 제안 목록(PENDING 우선, 만료 lazy 반영)
const getMyJobOffers = async (): Promise<JobOffer[]> => {
    const res = await api.get<JobOffer[]>('/api/job-offers/me');
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as JobOffer[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as JobOffer[];
    }
    return [];
};

// [API Mapping] PUT /api/job-offers/{offerId}/respond — 제안 수락/거절(수락 응답에만 storeCode 포함)
const respondToJobOffer = async (offerId: number, accept: boolean): Promise<JobOffer> => {
    const res = await api.put<JobOffer>(`/api/job-offers/${offerId}/respond`, {accept});
    const data: any = res.data as any;
    if (typeof data?.id === 'number') {
        return data as JobOffer;
    }
    if (typeof data?.data?.id === 'number') {
        return data.data as JobOffer;
    }
    throw new Error('Invalid job offer response');
};

// [API Mapping] PUT /api/stores/{storeId}/job-posting — 구인 공고 upsert(매장당 1건, ON/OFF 포함)
const upsertJobPosting = async (storeId: number, payload: JobPostingUpsertPayload): Promise<JobPosting> => {
    const res = await api.put<JobPosting>(`/api/stores/${storeId}/job-posting`, payload);
    const data: any = res.data as any;
    if (typeof data?.id === 'number') {
        return data as JobPosting;
    }
    if (typeof data?.data?.id === 'number') {
        return data.data as JobPosting;
    }
    throw new Error('Invalid job posting response');
};

// [API Mapping] GET /api/stores/{storeId}/job-posting — 내 매장 구인 공고 조회.
// 아직 공고를 만든 적이 없으면 BE 가 404(ENTITY_NOT_FOUND) 를 반환한다 — 이 경우 예외 대신 null 로
// 정규화해 "공고 없음(최초 작성 폼)" 과 "네트워크 오류"를 화면에서 구분할 수 있게 한다.
const getMyJobPosting = async (storeId: number): Promise<JobPosting | null> => {
    try {
        const res = await api.get<JobPosting>(`/api/stores/${storeId}/job-posting`);
        const data: any = res.data as any;
        if (typeof data?.id === 'number') {
            return data as JobPosting;
        }
        if (typeof data?.data?.id === 'number') {
            return data.data as JobPosting;
        }
        return null;
    } catch (err: any) {
        const status = err?.response?.status;
        const errorCode = err?.response?.data?.errorCode;
        if (status === 404 || errorCode === 'ENTITY_NOT_FOUND') {
            return null;
        }
        throw err;
    }
};

// [API Mapping] GET /api/job-postings/nearby — 내 희망지역 기준 4km 이내 open 공고(workType/category 필터)
const getNearbyJobPostings = async (filters?: JobPostingNearbyFilters): Promise<JobPostingNearbyItem[]> => {
    const params: Record<string, string> = {};
    if (filters?.workType) {
        params.workType = filters.workType;
    }
    if (filters?.category) {
        params.category = filters.category;
    }
    const hasParams = Object.keys(params).length > 0;
    const res = await api.get<JobPostingNearbyItem[]>(
        '/api/job-postings/nearby',
        hasParams ? params : undefined,
    );
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as JobPostingNearbyItem[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as JobPostingNearbyItem[];
    }
    return [];
};

// [API Mapping] POST /api/job-postings/{postingId}/applications — 구인 공고 지원(자격 게이트·중복 409)
const applyToJobPosting = async (
    postingId: number,
    payload?: JobApplicationCreatePayload,
): Promise<JobApplication> => {
    const res = await api.post<JobApplication>(`/api/job-postings/${postingId}/applications`, payload);
    const data: any = res.data as any;
    if (typeof data?.id === 'number') {
        return data as JobApplication;
    }
    if (typeof data?.data?.id === 'number') {
        return data.data as JobApplication;
    }
    throw new Error('Invalid job application response');
};

// [API Mapping] GET /api/job-applications/me — 내 지원 현황 조회
const getMyJobApplications = async (): Promise<JobApplication[]> => {
    const res = await api.get<JobApplication[]>('/api/job-applications/me');
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as JobApplication[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as JobApplication[];
    }
    return [];
};

// [API Mapping] GET /api/stores/{storeId}/job-applications — 매장 지원자 리스트(사장 전용, BOLA)
const getStoreJobApplications = async (storeId: number): Promise<JobApplicantListItem[]> => {
    const res = await api.get<JobApplicantListItem[]>(`/api/stores/${storeId}/job-applications`);
    const data: any = res.data as any;
    if (Array.isArray(data)) {
        return data as JobApplicantListItem[];
    }
    if (Array.isArray(data?.data)) {
        return data.data as JobApplicantListItem[];
    }
    return [];
};

// [API Mapping] PUT /api/job-applications/{id}/respond — 지원 수락/거절(수락 시에만 초대코드 알림)
const respondToJobApplication = async (
    applicationId: number,
    accept: boolean,
): Promise<JobApplicantListItem> => {
    const res = await api.put<JobApplicantListItem>(`/api/job-applications/${applicationId}/respond`, {accept});
    const data: any = res.data as any;
    if (typeof data?.applicationId === 'number') {
        return data as JobApplicantListItem;
    }
    if (typeof data?.data?.applicationId === 'number') {
        return data.data as JobApplicantListItem;
    }
    throw new Error('Invalid job application response');
};

const recruitmentService = {
    getMyJobSeeking,
    updateMyJobSeeking,
    getStoreJobSeekers,
    sendJobOffer,
    getMyJobOffers,
    respondToJobOffer,
    upsertJobPosting,
    getMyJobPosting,
    getNearbyJobPostings,
    applyToJobPosting,
    getMyJobApplications,
    getStoreJobApplications,
    respondToJobApplication,
};

export default recruitmentService;
export {
    getMyJobSeeking,
    updateMyJobSeeking,
    getStoreJobSeekers,
    sendJobOffer,
    getMyJobOffers,
    respondToJobOffer,
    upsertJobPosting,
    getMyJobPosting,
    getNearbyJobPostings,
    applyToJobPosting,
    getMyJobApplications,
    getStoreJobApplications,
    respondToJobApplication,
};
