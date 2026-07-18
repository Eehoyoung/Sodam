import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';
import recruitmentService from '../services/recruitmentService';
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
 * 인증채용(구직) TanStack Query 훅 — `/api/job-seekers/me` 정합.
 * `useNfcTagQueries.ts` 패턴(쿼리 훅 + 뮤테이션 훅 분리, onSuccess invalidate) 그대로 따른다.
 */

/** 내 구직 프로필 조회 — GET /api/job-seekers/me */
export const useMyJobSeeking = () =>
    useQuery({
        queryKey: queryKeys.recruitment.me(),
        queryFn: async (): Promise<JobSeekingProfile> => {
            try {
                return await recruitmentService.getMyJobSeeking();
            } catch (error) {
                handleQueryError(error, 'getMyJobSeeking');
                throw error;
            }
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '구직 정보를 가져오는데 실패했어요.'},
    });

/** 내 구직 프로필 수정 — PUT /api/job-seekers/me (성공 시 /me 캐시 즉시 갱신) */
export const useUpdateMyJobSeeking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: JobSeekingUpdatePayload): Promise<JobSeekingProfile> => {
            try {
                return await recruitmentService.updateMyJobSeeking(payload);
            } catch (error) {
                handleQueryError(error, 'updateMyJobSeeking');
                throw error;
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.recruitment.me(), data);
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.me()});
        },
        meta: {errorMessage: '구직 설정을 저장하지 못했어요.'},
    });
};

/**
 * [사장] 매장 반경 4km 구직자 리스트 — GET /api/stores/{storeId}/job-seekers (Phase 4, §7.4).
 * `workType` 필터별로 캐시를 분리(`storeSeekers` 쿼리키)해 세그먼트 전환 시 즉시 이전 결과가
 * 보이고 백그라운드로 갱신되도록 한다. `useFocusEffect` + `refetch` 는 화면에서 조합한다.
 */
export const useJobSeekers = (storeId: number, filters?: JobSeekerListFilters) =>
    useQuery({
        queryKey: queryKeys.recruitment.storeSeekers(storeId, filters?.workType),
        queryFn: async (): Promise<JobSeekerListItem[]> => {
            try {
                return await recruitmentService.getStoreJobSeekers(storeId, filters);
            } catch (error) {
                handleQueryError(error, 'getStoreJobSeekers');
                throw error;
            }
        },
        enabled: !!storeId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '구직자 리스트를 가져오는데 실패했어요.'},
    });

/**
 * Phase 6 — 매칭 왕복(제안·공고·지원) 훅. 세그먼트 전환 시 refetch 는 화면에서 `useFocusEffect` +
 * `refetch()` 조합으로 처리한다(§10 Phase6 "세그먼트 전환마다 refetch" 신규 확정 패턴) — 탭 내용을
 * 조건부 렌더로 마운트/언마운트하는 기존 구조(`{tabIndex===0 ? <X/> : null}`)에서는 각 탭 컴포넌트가
 * 매 마운트마다 `useFocusEffect` 를 다시 타므로 별도 장치 없이 이 패턴만으로 충분하다.
 */

// [사장→직원] 채용 제안 발송 — POST /api/stores/{storeId}/job-offers (§15)
export const useSendJobOffer = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: JobOfferCreatePayload): Promise<JobOffer> => {
            try {
                return await recruitmentService.sendJobOffer(storeId, payload);
            } catch (error) {
                handleQueryError(error, 'sendJobOffer');
                throw error;
            }
        },
        onSuccess: () => {
            // 리스트 카드의 offerStatus 뱃지(§15.3) 갱신 대상 — 유형 필터별 캐시를 모두 무효화.
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.store(storeId)});
        },
        meta: {errorMessage: '채용 제안을 보내지 못했어요.'},
    });
};

// [직원] 받은 채용 제안 목록 — GET /api/job-offers/me (§15)
export const useMyJobOffers = () =>
    useQuery({
        queryKey: queryKeys.recruitment.myOffers(),
        queryFn: async (): Promise<JobOffer[]> => {
            try {
                return await recruitmentService.getMyJobOffers();
            } catch (error) {
                handleQueryError(error, 'getMyJobOffers');
                throw error;
            }
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '받은 제안을 가져오는데 실패했어요.'},
    });

// [직원] 채용 제안 수락/거절 — PUT /api/job-offers/{offerId}/respond (§15)
export const useRespondToJobOffer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {offerId: number; accept: boolean}): Promise<JobOffer> => {
            try {
                return await recruitmentService.respondToJobOffer(vars.offerId, vars.accept);
            } catch (error) {
                handleQueryError(error, 'respondToJobOffer');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.myOffers()});
        },
        meta: {errorMessage: '제안 응답을 처리하지 못했어요.'},
    });
};

// [사장] 구인 공고 upsert — PUT /api/stores/{storeId}/job-posting (§19)
export const useUpsertJobPosting = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: JobPostingUpsertPayload): Promise<JobPosting> => {
            try {
                return await recruitmentService.upsertJobPosting(storeId, payload);
            } catch (error) {
                handleQueryError(error, 'upsertJobPosting');
                throw error;
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.recruitment.myPosting(storeId), data);
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.myPosting(storeId)});
        },
        meta: {errorMessage: '구인 공고를 저장하지 못했어요.'},
    });
};

// [사장] 내 매장 구인 공고 조회 — GET /api/stores/{storeId}/job-posting (§19, 없으면 null)
export const useMyJobPosting = (storeId: number) =>
    useQuery({
        queryKey: queryKeys.recruitment.myPosting(storeId),
        queryFn: async (): Promise<JobPosting | null> => {
            try {
                return await recruitmentService.getMyJobPosting(storeId);
            } catch (error) {
                handleQueryError(error, 'getMyJobPosting');
                throw error;
            }
        },
        enabled: !!storeId,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '구인 공고를 가져오는데 실패했어요.'},
    });

// [직원] 주변 구인 매장 리스트 — GET /api/job-postings/nearby (§19, 필터별 캐시 분리)
export const useNearbyJobPostings = (filters?: JobPostingNearbyFilters) =>
    useQuery({
        queryKey: queryKeys.recruitment.nearbyPostings(filters?.workType, filters?.category),
        queryFn: async (): Promise<JobPostingNearbyItem[]> => {
            try {
                return await recruitmentService.getNearbyJobPostings(filters);
            } catch (error) {
                handleQueryError(error, 'getNearbyJobPostings');
                throw error;
            }
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '주변 구인 공고를 가져오는데 실패했어요.'},
    });

// [직원] 구인 공고 지원 — POST /api/job-postings/{postingId}/applications (§19)
export const useApplyToJobPosting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {postingId: number; payload?: JobApplicationCreatePayload}): Promise<JobApplication> => {
            try {
                return await recruitmentService.applyToJobPosting(vars.postingId, vars.payload);
            } catch (error) {
                handleQueryError(error, 'applyToJobPosting');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.myApplications()});
        },
        meta: {errorMessage: '지원을 완료하지 못했어요.'},
    });
};

// [직원] 내 지원 현황 — GET /api/job-applications/me (§19)
export const useMyJobApplications = () =>
    useQuery({
        queryKey: queryKeys.recruitment.myApplications(),
        queryFn: async (): Promise<JobApplication[]> => {
            try {
                return await recruitmentService.getMyJobApplications();
            } catch (error) {
                handleQueryError(error, 'getMyJobApplications');
                throw error;
            }
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '내 지원 현황을 가져오는데 실패했어요.'},
    });

// [사장] 매장 지원자 리스트 — GET /api/stores/{storeId}/job-applications (§19)
export const useStoreJobApplications = (storeId: number) =>
    useQuery({
        queryKey: queryKeys.recruitment.storeApplications(storeId),
        queryFn: async (): Promise<JobApplicantListItem[]> => {
            try {
                return await recruitmentService.getStoreJobApplications(storeId);
            } catch (error) {
                handleQueryError(error, 'getStoreJobApplications');
                throw error;
            }
        },
        enabled: !!storeId,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '지원자 리스트를 가져오는데 실패했어요.'},
    });

// [사장] 지원 수락/거절 — PUT /api/job-applications/{id}/respond (§19)
export const useRespondToJobApplication = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {applicationId: number; accept: boolean}): Promise<JobApplicantListItem> => {
            try {
                return await recruitmentService.respondToJobApplication(vars.applicationId, vars.accept);
            } catch (error) {
                handleQueryError(error, 'respondToJobApplication');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKeys.recruitment.storeApplications(storeId)});
        },
        meta: {errorMessage: '지원 응답을 처리하지 못했어요.'},
    });
};
