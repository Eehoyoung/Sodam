import { apiFetch } from "./api";
import type { StoreEmployee, StoreSummary } from "./backend-types";

/** 사장이 소유한 매장 목록 — backend StoreController.getStoresByMaster (GET /api/stores/master/current). */
export function fetchMyStores(): Promise<StoreSummary[]> {
  return apiFetch<StoreSummary[]>("/api/stores/master/current");
}

/** 매장 단건 조회 — GET /api/stores/{id}. */
export function fetchStoreById(storeId: number): Promise<StoreSummary> {
  return apiFetch<StoreSummary>(`/api/stores/${storeId}`);
}

/** 매장 소속 직원 목록 — GET /api/stores/{storeId}/employees. */
export function fetchStoreEmployees(storeId: number): Promise<StoreEmployee[]> {
  return apiFetch<StoreEmployee[]>(`/api/stores/${storeId}/employees`);
}
