import { useCallback, useState } from 'react';
import {AppToast} from '../../../common/components/ds';
import storeService, { StoreRegistrationPayload } from '../services/storeService';

interface Options {
  onSuccess?: (storeId: number) => void;
}

export const useStoreRegistration = (options?: Options) => {
  const [isLoading, setIsLoading] = useState(false);

  const submit = useCallback(async (payload: StoreRegistrationPayload) => {
    if (isLoading) {return;}
    setIsLoading(true);
    try {
      const { id } = await storeService.createStore(payload);
      AppToast.success('매장이 등록됐어요.');
      options?.onSuccess?.(id);
    } catch (e: any) {
      console.error('[StoreRegistration] submit error', e);
      const status = e?.response?.status;
      const data = e?.response?.data;
      // 402 PLAN_REQUIRED 는 전역 인터셉터가 페이월을 띄우므로 여기서 토스트를 중복으로 띄우지 않는다.
      if (status === 402 && (data?.errorCode === 'PLAN_REQUIRED' || data?.code === 'PLAN_REQUIRED')) {
        return;
      }
      // BE 가 내려준 실제 사유(예: 중복 사업자번호 409)를 그대로 보여준다 — "잠시 후 재시도"로 뭉개지 않는다.
      const beMessage = typeof data?.message === 'string' ? data.message : null;
      AppToast.error(beMessage ?? '매장 등록에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, options]);

  return { isLoading, submit };
};

export default useStoreRegistration;
