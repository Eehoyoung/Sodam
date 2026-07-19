import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError} from '../../../common/query/errorHandler';
import nfcTagService, {StoreNfcTag} from '../services/nfcTagService';

/**
 * 매장 NFC 태그 관리 TanStack Query 훅 — /api/stores/{storeId}/nfc-tags 정합.
 * 사장 전용(NfcTagManagementScreen).
 */

/** 매장(store) 쿼리 키 — WP-05 2단계, feature가 직접 소유. nfcTags 외 하위 키는 실제 사용처가
 * 없어(dead code) 이관하지 않았다. */
export const storeQueryKeys = {
    all: ['store'] as const,
    nfcTags: (storeId: number) => [...storeQueryKeys.all, 'nfcTags', storeId] as const,
};

/** 매장 NFC 태그 목록(활성+비활성) — GET /api/stores/{storeId}/nfc-tags */
export const useNfcTags = (storeId: number, enabled = true) =>
    useQuery({
        queryKey: storeQueryKeys.nfcTags(storeId),
        queryFn: async (): Promise<StoreNfcTag[]> => {
            try {
                return await nfcTagService.fetchNfcTags(storeId);
            } catch (error) {
                handleQueryError(error, 'fetchNfcTags');
                throw error;
            }
        },
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        enabled: enabled && !!storeId,
        meta: {errorMessage: 'NFC 태그 목록을 가져오는데 실패했습니다.'},
    });

/** 태그 등록 — POST /api/stores/{storeId}/nfc-tags */
export const useRegisterNfcTag = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({tagId, label}: {tagId: string; label?: string}): Promise<StoreNfcTag> => {
            try {
                return await nfcTagService.registerNfcTag(storeId, tagId, label);
            } catch (error) {
                handleQueryError(error, 'registerNfcTag');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: storeQueryKeys.nfcTags(storeId)});
        },
        meta: {errorMessage: 'NFC 태그 등록에 실패했습니다.'},
    });
};

/** 태그 비활성화 — DELETE /api/stores/{storeId}/nfc-tags/{tagPk} */
export const useDeactivateNfcTag = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tagPk: number): Promise<void> => {
            try {
                await nfcTagService.deactivateNfcTag(storeId, tagPk);
            } catch (error) {
                handleQueryError(error, 'deactivateNfcTag');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: storeQueryKeys.nfcTags(storeId)});
        },
        meta: {errorMessage: 'NFC 태그 비활성화에 실패했습니다.'},
    });
};

/** 태그 재활성화 — PATCH /api/stores/{storeId}/nfc-tags/{tagPk}/activate */
export const useActivateNfcTag = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tagPk: number): Promise<void> => {
            try {
                await nfcTagService.activateNfcTag(storeId, tagPk);
            } catch (error) {
                handleQueryError(error, 'activateNfcTag');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: storeQueryKeys.nfcTags(storeId)});
        },
        meta: {errorMessage: 'NFC 태그 재활성화에 실패했습니다.'},
    });
};
