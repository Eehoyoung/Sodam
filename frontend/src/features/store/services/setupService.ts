import api from '../../../common/api/client';

/**
 * 매장 설정 완성도 + 다음 한 가지 액션 (GR-NEW-06).
 * BE: GET /api/stores/{storeId}/setup-progress (사장 전용)
 */
export interface SetupItem {
  key: string;
  label: string;
  done: boolean;
}

export interface StoreSetupProgress {
  storeId: number;
  completionRate: number;
  items: SetupItem[];
  nextActionKey: string | null;
  nextActionLabel: string | null;
}

export async function fetchStoreSetupProgress(storeId: number): Promise<StoreSetupProgress> {
  const {data} = await api.get<StoreSetupProgress>(`/api/stores/${storeId}/setup-progress`);
  return data;
}
