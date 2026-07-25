import {useCallback, useEffect, useState} from 'react';
import {useAuth} from '../../../contexts/AuthContext';
import storeService from '../services/storeService';

/** 직원이 속한 매장 토픽을 구독하기 위한 최소 store id 목록. */
export function useEmployeeStoreIds(): number[] {
    const {user} = useAuth();
    const [storeIds, setStoreIds] = useState<number[]>([]);

    const load = useCallback(async () => {
        if (!user?.id) {
            setStoreIds([]);
            return;
        }
        try {
            const stores = await storeService.getEmployeeStores(user.id);
            setStoreIds(stores.map(store => store.id));
        } catch {
            setStoreIds([]);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return storeIds;
}
