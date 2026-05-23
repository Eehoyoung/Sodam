import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
      Alert.alert('매장 등록 완료', '매장이 성공적으로 등록되었습니다.');
      options?.onSuccess?.(id);
    } catch (e: any) {
      console.error('[StoreRegistration] submit error', e);
      Alert.alert('오류', '매장 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, options]);

  return { isLoading, submit };
};

export default useStoreRegistration;
