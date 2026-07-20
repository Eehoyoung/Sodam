import api from '../../../common/api/client';

/**
 * 대타 지원 보드(직원용) 서비스.
 * 사장용 swapService.ts 와 별개 파일 — 직원 지원 흐름 전용.
 *
 * BE 계약:
 *   GET  /api/stores/{storeId}/swap-requests?status=OPEN
 *   POST /api/swap-requests/{id}/apply  (400: 본인 시프트, 409: 중복지원/마감)
 */

export interface SwapApplicant {
  employeeId: number;
  employeeName: string;
  appliedAt: string;
}

export type SwapRequestStatus = 'OPEN' | 'CLOSED' | 'CONFIRMED' | string;

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

/** 매장의 OPEN 상태 대타 모집 목록. */
export async function fetchOpenSwaps(storeId: number): Promise<SwapRequest[]> {
  const {data} = await api.get<SwapRequest[]>(
    `/api/stores/${storeId}/swap-requests`,
    {status: 'OPEN'},
  );
  const anyData: any = data as any;
  if (Array.isArray(anyData)) {
    return anyData as SwapRequest[];
  }
  if (Array.isArray(anyData?.data)) {
    return anyData.data as SwapRequest[];
  }
  return [];
}

/** 대타 모집에 본인 지원. 400=본인 시프트, 409=중복지원/마감. */
export async function applySwap(swapRequestId: number): Promise<void> {
  await api.post(`/api/swap-requests/${swapRequestId}/apply`, {});
}
