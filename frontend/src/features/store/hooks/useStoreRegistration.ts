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
      AppToast.error('매장 등록에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, options]);

  return { isLoading, submit };
};

export default useStoreRegistration;
