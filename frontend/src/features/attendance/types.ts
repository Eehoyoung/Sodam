/**
 * 출퇴근 관리 관련 타입 정의
 */

/**
 * 출퇴근 기록 인터페이스
 */
export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    workplaceId: string;
    workplaceName: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: AttendanceStatus;
    workHours?: number;
    breakTime?: number;
    note?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * 출퇴근 상태 열거형
 */
export enum AttendanceStatus {
    PENDING = 'PENDING',       // 출근 전
    CHECKED_IN = 'CHECKED_IN', // 출근 완료
    CHECKED_OUT = 'CHECKED_OUT', // 퇴근 완료
    ABSENT = 'ABSENT',         // 결근
    LATE = 'LATE',             // 지각
    EARLY_LEAVE = 'EARLY_LEAVE', // 조퇴
    ON_LEAVE = 'ON_LEAVE'      // 휴가
}

/**
 * 출근 요청 인터페이스
 * BE AttendanceRequestDto 와 매핑: employeeId/storeId/latitude/longitude 모두 @NotNull.
 * 위치는 매장 반경 검증에 사용되므로 호출 전 GPS 권한 + 좌표 확보 필수.
 */
export interface CheckInRequest {
    employeeId: number;
    workplaceId: string;
    latitude: number;
    longitude: number;
    note?: string;
}

/**
 * 퇴근 요청 인터페이스 (CheckInRequest 와 동일 필수 4필드)
 */
export interface CheckOutRequest {
    employeeId: number;
    workplaceId: string;
    latitude: number;
    longitude: number;
    note?: string;
}

/**
 * 출퇴근 기록 수정 요청 인터페이스
 */
export interface UpdateAttendanceRequest {
    checkInTime?: string;
    checkOutTime?: string;
    status?: AttendanceStatus;
    note?: string;
    breakTime?: number;
}

/**
 * 출퇴근 통계 인터페이스
 */
export interface AttendanceStatistics {
    totalWorkDays: number;
    totalWorkHours: number;
    averageWorkHoursPerDay: number;
    lateCount: number;
    absentCount: number;
    earlyLeaveCount: number;
    onLeaveCount: number;
    overtimeHours: number;
}

/**
 * 출퇴근 필터 인터페이스
 */
export interface AttendanceFilter {
    startDate: string;
    endDate: string;
    workplaceId?: string;
    employeeId?: string;
    status?: AttendanceStatus;
}

/**
 * 월급제 정규직 지각/조퇴/결근 — 예정(스케줄) 대비 실제 출퇴근 차이 자동 감지 + 사장 확정.
 * BE AttendanceIrregularityController 와 매핑.
 */
export type AttendanceIrregularityType = 'LATE' | 'EARLY_LEAVE' | 'ABSENCE';

export type AttendanceIrregularityResolution = 'PENDING' | 'WAIVED' | 'DEDUCTED' | 'CONVERTED_TO_LEAVE';

export interface AttendanceIrregularity {
    id: number;
    employeeId: number;
    employeeName: string | null;
    storeId: number;
    shiftDate: string;
    type: AttendanceIrregularityType;
    minutesShort: number;
    resolution: AttendanceIrregularityResolution;
    deductedAmount: number | null;
    note: string | null;
    resolvedAt: string | null;
}

/** 직원의 지각/조퇴/결근 사전 신고 — 사장에게 알리는 용도일 뿐 임금 계산에는 영향을 주지 않는다. */
export type AttendanceNoticeType = 'LATE_EXPECTED' | 'EARLY_LEAVE_EXPECTED' | 'ABSENCE_EXPECTED';
