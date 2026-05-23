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
 */
export interface CheckInRequest {
    workplaceId: string;
    note?: string;
    latitude?: number;
    longitude?: number;
}

/**
 * 퇴근 요청 인터페이스
 */
export interface CheckOutRequest {
    workplaceId: string;
    note?: string;
    latitude?: number;
    longitude?: number;
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
