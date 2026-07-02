/**
 * 출퇴�?관�?관???�비??
 * 출퇴�?기록 조회, 출근, ?�근, ?�정 �??�계 기능???�공?�니??
 */

import api from '../../../common/utils/api';
import {
    AttendanceFilter,
    AttendanceRecord,
    AttendanceStatistics,
    AttendanceStatus,
    CheckInRequest,
    CheckOutRequest,
    UpdateAttendanceRequest
} from '../types';
import {NFCVerifyResponse, verifyCheckInByNFC, verifyCheckOutByNFC} from './nfcAttendanceService';
import {logger} from '../../../utils/logger';

// [API Mapping] Attendance verification standardized; legacy location-verify endpoint removed per Phase 0 AC (2025-10-02).

/**
 * BE AttendanceRequestDto 4필드(@NotNull) 매핑 헬퍼.
 * employeeId/storeId 는 Long, latitude/longitude 는 Double. 누락 시 400 발생하므로 fail-fast.
 */
const toAttendancePayload = (data: CheckInRequest | CheckOutRequest) => {
    const storeIdNum = Number(data.workplaceId);
    const employeeIdNum = Number(data.employeeId);
    if (!Number.isFinite(storeIdNum)) {
        throw new Error('INVALID_STORE_ID');
    }
    if (!Number.isFinite(employeeIdNum)) {
        throw new Error('INVALID_EMPLOYEE_ID');
    }
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new Error('INVALID_LOCATION');
    }
    return {
        employeeId: employeeIdNum,
        storeId: storeIdNum,
        latitude: data.latitude,
        longitude: data.longitude,
        note: data.note,
    };
};

// 출퇴근 관련 서비스 객체
const attendanceService = {
    /**
     * 출퇴�?기록 목록 조회
     * @param filter ?�터 조건
     * @returns 출퇴�?기록 목록
     */
    getAttendanceRecords: async (filter: AttendanceFilter): Promise<AttendanceRecord[]> => {
        try {
            // BE 실엔드포인트는 /api/attendance/employee/{employeeId}?startDate&endDate (ISO DATE_TIME).
            // 과거엔 존재하지 않는 GET /api/attendance 를 호출해 404 가 났다.
            const employeeIdNum = Number(filter.employeeId);
            if (!Number.isFinite(employeeIdNum)) {
                return [];
            }
            // yyyy-MM-dd → ISO LocalDateTime (하루 경계 포함)
            const toStart = (d: string) => (d.includes('T') ? d : `${d}T00:00:00`);
            const toEnd = (d: string) => (d.includes('T') ? d : `${d}T23:59:59`);
            const response = await api.get<AttendanceRecord[]>(
                `/api/attendance/employee/${employeeIdNum}`,
                {startDate: toStart(filter.startDate), endDate: toEnd(filter.endDate)},
            );
            return response.data;
        } catch (error) {
            logger.error('출퇴�?기록??가?�오??�??�류가 발생?�습?�다', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * ?�정 출퇴�?기록 조회
     * @param attendanceId 출퇴�?기록 ID
     * @returns 출퇴�?기록
     */
    getAttendanceById: async (attendanceId: string): Promise<AttendanceRecord> => {
        try {
            const response = await api.get<AttendanceRecord>(`/api/attendance/${attendanceId}`);
            return response.data;
        } catch (error) {
            logger.error('?�정 출퇴�?기록??가?�오??�??�류가 발생?�습?�다', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 출근 처리 — BE AttendanceRequestDto 4필드 모두 @NotNull (employeeId/storeId/latitude/longitude)
     */
    checkIn: async (checkInData: CheckInRequest): Promise<AttendanceRecord> => {
        try {
            const payload = toAttendancePayload(checkInData);
            const response = await api.post<AttendanceRecord>('/api/attendance/check-in', payload);
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 퇴근 처리(표준) — 경로 파라미터 제거, 본문 방식
     */
    checkOutStandard: async (checkOutData: CheckOutRequest): Promise<AttendanceRecord> => {
        try {
            const payload = toAttendancePayload(checkOutData);
            const response = await api.post<AttendanceRecord>('/api/attendance/check-out', payload);
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * @deprecated 경로 파라미터 방식은 폐지됨. 내부적으로 표준 방식으로 위임.
     */
    checkOut: async (_attendanceId: string, checkOutData: CheckOutRequest): Promise<AttendanceRecord> => {
        try {
            const payload = toAttendancePayload(checkOutData);
            const response = await api.post<AttendanceRecord>('/api/attendance/check-out', payload);
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 출퇴�?기록 ?�정
     * @param attendanceId 출퇴�?기록 ID
     * @param updateData ?�정 ?�이??
     * @returns ?�데?�트??출퇴�?기록
     */
    updateAttendance: async (attendanceId: string, updateData: UpdateAttendanceRequest): Promise<AttendanceRecord> => {
        try {
            const response = await api.put<AttendanceRecord>(`/api/attendance/${attendanceId}`, updateData);
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 출퇴�?기록 ??��
     * @param attendanceId 출퇴�?기록 ID
     */
    deleteAttendance: async (attendanceId: string): Promise<void> => {
        try {
            await api.delete(`/api/attendance/${attendanceId}`);
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * ?�재 근무 ?�태 조회
     * @param workplaceId 근무지 ID
     * @returns ?�재 출퇴�?기록 (?�으�?null)
     */
    getCurrentAttendance: async (workplaceId: string, employeeId?: string | number): Promise<AttendanceRecord | null> => {
        // BE 실엔드포인트: GET /api/attendance/employee/{employeeId}/today (오늘 기록 없으면 204).
        // 과거엔 존재하지 않는 /api/attendance/current 를 호출해 404 가 났다.
        const empId = Number(employeeId);
        if (!Number.isFinite(empId)) {
            return null;
        }
        try {
            const response = await api.get<AttendanceRecord | null>(
                `/api/attendance/employee/${empId}/today`,
                { storeId: Number(workplaceId) },
            );
            return response.data ?? null; // 204 No Content → 빈 응답 → null
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return null; // 오늘 기록 없음
            }
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 출퇴�??�계 조회
     * @param filter ?�터 조건
     * @returns 출퇴�??�계
     */
    getAttendanceStatistics: async (filter: AttendanceFilter): Promise<AttendanceStatistics> => {
        try {
            const response = await api.get<AttendanceStatistics>('/api/attendance/statistics', filter);
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 직원�?출퇴�??�계 조회
     * @param employeeId 직원 ID
     * @param startDate ?�작??
     * @param endDate 종료??
     * @returns 직원�?출퇴�??�계
     */
    getEmployeeAttendanceStatistics: async (
        employeeId: string,
        startDate: string,
        endDate: string
    ): Promise<AttendanceStatistics> => {
        try {
            const response = await api.get<AttendanceStatistics>(`/api/attendance/statistics/employee/${employeeId}`, {
                startDate,
                endDate
            });
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * 근무지�?출퇴�??�계 조회
     * @param workplaceId 근무지 ID
     * @param startDate ?�작??
     * @param endDate 종료??
     * @returns 근무지�?출퇴�??�계
     */
    getWorkplaceAttendanceStatistics: async (
        workplaceId: string,
        startDate: string,
        endDate: string
    ): Promise<AttendanceStatistics> => {
        try {
            const storeIdNum = Number(workplaceId);
            const response = await api.get<AttendanceStatistics>(`/api/attendance/statistics/store/${storeIdNum}`, {
                startDate,
                endDate
            });
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * ?�괄 출퇴�??�태 변�?
     * @param attendanceIds 출퇴�?기록 ID 배열
     * @param status 변경할 ?�태
     * @returns ?�데?�트??출퇴�?기록 배열
     */
    batchUpdateStatus: async (
        attendanceIds: string[],
        status: AttendanceStatus
    ): Promise<AttendanceRecord[]> => {
        try {
            const response = await api.put<AttendanceRecord[]>('/api/attendance/batch-status', {
                attendanceIds,
                status
            });
            return response.data;
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },

    /**
     * ?�치 기반 출퇴�??�증
     * @param employeeId 직원 ID
     * @param workplaceId 근무지 ID
     * @param latitude ?�도
     * @param longitude 경도
     * @returns ?�증 결과 (?�공 ?��? �?거리 ?�보)
     */
    verifyLocationAttendance: async (
        employeeId: string,
        workplaceId: string,
        latitude: number,
        longitude: number
    ): Promise<{ success: boolean; distance?: number; message?: string }> => {
        try {
            const employeeIdNum = Number(employeeId);
            const storeIdNum = Number(workplaceId);
            if (!Number.isFinite(employeeIdNum) || !Number.isFinite(storeIdNum)) {
                return { success: false, message: '유효하지 않은 매장/직원 ID입니다.' };
            }
            const payload = { employeeId: employeeIdNum, storeId: storeIdNum, latitude, longitude };
            // Legacy location-verify fallback removed per Phase 0 AC (2025-10-02); errors propagate to the outer catch
            const response = await api.post<any>(
                '/api/attendance/verify/location',
                payload
            );
            const raw = response.data;
            const data = raw?.data ?? raw;
            return {
                success: !!data?.success,
                distance: data?.distance,
                message: data?.message ?? data?.reason,
            };
        } catch (error) {
            logger.error('', 'ATTENDANCE_SERVICE', error);
            throw error;
        }
    },



    /**
     * NFC ?�그 기반 출퇴�??�증 (?�퍼)
     * @param employeeId 직원 ID (number ?�는 string ?�용)
     * @param workplaceId 근무지 ID (number ?�는 string ?�용)
     * @param nfcTagId NFC ?�그 문자??
     * @param isCheckOut ?�근 ?��? (기본 false = 출근)
     */
    verifyNfcTagAttendance: async (
        employeeId: string | number,
        workplaceId: string | number,
        nfcTagId: string,
        isCheckOut: boolean = false
    ): Promise<NFCVerifyResponse> => {
        const employeeIdNum = typeof employeeId === 'string' ? Number(employeeId) : employeeId;
        const storeIdNum = typeof workplaceId === 'string' ? Number(workplaceId) : workplaceId;
        if (!Number.isFinite(employeeIdNum) || !Number.isFinite(storeIdNum)) {
            return {success: false, message: '?�효?��? ?��? ID?�니??'};
        }

        if (isCheckOut) {
            return await verifyCheckOutByNFC({employeeId: employeeIdNum, storeId: storeIdNum, tagId: nfcTagId});
        }
        return await verifyCheckInByNFC({employeeId: employeeIdNum, storeId: storeIdNum, tagId: nfcTagId});
    },
};

export default attendanceService;
