/**
 * 대타(시프트 교대) 공용 타입 — 사장용 swapService 와 직원용 swapBoardService 가 같은 BE 리소스
 * (`/api/stores/{storeId}/swap-requests`)를 쓰면서 타입을 각자 정의하고 있었다(P3-14).
 *
 * 상태값은 BE `com.rich.sodam.domain.type.SwapRequestStatus` 가 진실이다 —
 * 직원용 쪽이 쓰던 'CLOSED'/'CONFIRMED' 는 BE 에 존재하지 않는 값이었다.
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
