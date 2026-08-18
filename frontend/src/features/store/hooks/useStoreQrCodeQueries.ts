import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError} from '../../../common/query/errorHandler';
import storeQrService, {StoreQrCode} from '../services/storeQrService';
import {storeQueryKeys} from './useNfcTagQueries';

/**
 * 매장 QR 관리 TanStack Query 훅 — /api/stores/{storeId}/qr 정합.
 * 사장 전용(StoreQrCodeScreen).
 */

/** 매장 QR 조회 — GET /api/stores/{storeId}/qr (없으면 서버가 자동 발급) */
export const useStoreQrCode = (storeId: number, enabled = true) =>
    useQuery({
        queryKey: storeQueryKeys.qrCode(storeId),
        queryFn: async (): Promise<StoreQrCode> => {
            try {
                return await storeQrService.fetchStoreQrCode(storeId);
            } catch (error) {
                handleQueryError(error, 'fetchStoreQrCode');
                throw error;
            }
        },
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        enabled: enabled && !!storeId,
        meta: {errorMessage: '매장 QR을 가져오는데 실패했습니다.'},
    });

/** QR 재발급 — POST /api/stores/{storeId}/qr/rotate (유출 대응, 이전 QR 즉시 무효화) */
export const useRotateStoreQrCode = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<StoreQrCode> => {
            try {
                return await storeQrService.rotateStoreQrCode(storeId);
            } catch (error) {
                handleQueryError(error, 'rotateStoreQrCode');
                throw error;
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData(storeQueryKeys.qrCode(storeId), data);
        },
        meta: {errorMessage: 'QR 재발급에 실패했습니다.'},
    });
};
