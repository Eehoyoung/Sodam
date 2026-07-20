import api from '../../../common/api/client';

/**
 * 대타(시프트 교대) 모집 — 사장이 시프트에 대해 모집을 열고, 지원자 중 1명을 확정한다.
 * BE 계약 기반 FE 선행 구현. 조회용 시프트 목록은 shiftService.fetchStoreShifts 재사용.
 */
export type SwapRequestStatus = 'OPEN' | 'FILLED' | 'CANCELLED';

export interface SwapApplicant {
    employeeId: number;
    employeeName: string;
    appliedAt: string;
}

export interface SwapRequest {
    id: number;
    shiftId: number;
    shiftDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM[:SS]
    endTime: string; // HH:MM[:SS]
    status: SwapRequestStatus;
    originalEmployeeName?: string;
    applicants: SwapApplicant[];
}

/** 매장 대타 모집 목록(상태 필터). */
export async function fetchSwapRequests(
    storeId: number,
    status: SwapRequestStatus = 'OPEN',
): Promise<SwapRequest[]> {
    const {data} = await api.get<SwapRequest[]>(`/api/stores/${storeId}/swap-requests`, {status});
    return Array.isArray(data) ? data : [];
}

/** 시프트에 대해 대타 모집 시작(직원들에게 알림). */
export async function createSwapRequest(shiftId: number): Promise<void> {
    await api.post(`/api/shifts/${shiftId}/swap-requests`, {});
}

/** 지원자 중 한 명으로 확정. */
export async function approveSwapRequest(requestId: number, employeeId: number): Promise<void> {
    await api.post(`/api/swap-requests/${requestId}/approve`, {employeeId});
}

/** 모집 취소. */
export async function cancelSwapRequest(requestId: number): Promise<void> {
    await api.post(`/api/swap-requests/${requestId}/cancel`, {});
}
