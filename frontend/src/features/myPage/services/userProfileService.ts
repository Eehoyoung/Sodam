import api from '../../../common/utils/api';
import {
    UserProfile,
    EmployeeProfile,
    ManagerProfile,
    MasterProfile,
    Workplace,
    AttendanceRecord,
    SalaryRecord,
    UserRole
} from '../types';

/**
 * 사용자 프로필 관련 서비스
 * 사용자 프로필, 근태, 급여 관리 기능을 제공합니다.
 */

// 사용자 프로필 서비스 객체
const userProfileService = {
    /**
     * 현재 사용자 프로필 조회
     * @returns 사용자 프로필
     */
    getCurrentUserProfile: async (): Promise<UserProfile> => {
        try {
            const response = await api.get<UserProfile>('/user/profile');
            return response.data;
        } catch (error) {
            console.error('사용자 프로필을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 사용자 프로필 업데이트
     * @param profileData 업데이트할 프로필 데이터
     * @returns 업데이트된 사용자 프로필
     */
    updateUserProfile: async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
        try {
            const response = await api.put<UserProfile>('/user/profile', profileData);
            return response.data;
        } catch (error) {
            console.error('사용자 프로필을 업데이트하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 프로필 이미지 업로드
     * @param imageFile 이미지 파일
     * @returns 업데이트된 사용자 프로필
     */
    uploadProfileImage: async (imageFile: File): Promise<UserProfile> => {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await api.post<UserProfile>('/user/profile/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error) {
            console.error('프로필 이미지를 업로드하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원 프로필 조회
     * @returns 직원 프로필
     */
    getEmployeeProfile: async (): Promise<EmployeeProfile> => {
        try {
            const response = await api.get<EmployeeProfile>('/user/employee-profile');
            return response.data;
        } catch (error) {
            console.error('직원 프로필을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 매니저 프로필 조회
     * @returns 매니저 프로필
     */
    getManagerProfile: async (): Promise<ManagerProfile> => {
        try {
            const response = await api.get<ManagerProfile>('/user/manager-profile');
            return response.data;
        } catch (error) {
            console.error('매니저 프로필을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 마스터 프로필 조회
     * @returns 마스터 프로필
     */
    getMasterProfile: async (): Promise<MasterProfile> => {
        try {
            const response = await api.get<MasterProfile>('/user/master-profile');
            return response.data;
        } catch (error) {
            console.error('마스터 프로필을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원의 근무지 목록 조회
     * @returns 근무지 목록
     */
    getEmployeeWorkplaces: async (): Promise<Workplace[]> => {
        try {
            const response = await api.get<Workplace[]>('/user/workplaces');
            return response.data;
        } catch (error) {
            console.error('근무지 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원의 출퇴근 기록 조회
     * @param startDate 시작 날짜 (YYYY-MM-DD)
     * @param endDate 종료 날짜 (YYYY-MM-DD)
     * @param workplaceId 근무지 ID (선택적)
     * @returns 출퇴근 기록 목록
     */
    getAttendanceRecords: async (startDate: string, endDate: string, workplaceId?: string): Promise<AttendanceRecord[]> => {
        try {
            const params: any = {startDate, endDate};
            if (workplaceId) {
                params.workplaceId = workplaceId;
            }

            const response = await api.get<AttendanceRecord[]>('/user/attendance-records', params);
            return response.data;
        } catch (error) {
            console.error('출퇴근 기록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원의 급여 기록 조회
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @param workplaceId 근무지 ID (선택적)
     * @returns 급여 기록 목록
     */
    getSalaryRecords: async (year: string, month?: number, workplaceId?: string): Promise<SalaryRecord[]> => {
        try {
            const params: any = {year};
            if (month) {
                params.month = month;
            }
            if (workplaceId) {
                params.workplaceId = workplaceId;
            }

            const response = await api.get<SalaryRecord[]>('/user/salary-records', params);
            return response.data;
        } catch (error) {
            console.error('급여 기록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 특정 급여 기록 상세 조회
     * @param salaryId 급여 기록 ID
     * @returns 급여 기록 상세
     */
    getSalaryRecordById: async (salaryId: string): Promise<SalaryRecord> => {
        try {
            const response = await api.get<SalaryRecord>(`/user/salary-records/${salaryId}`);
            return response.data;
        } catch (error) {
            console.error('급여 기록 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 통계 조회
     * @param year 연도 (YYYY)
     * @returns 급여 통계 데이터
     */
    getSalaryStatistics: async (year: string): Promise<any> => {
        try {
            const response = await api.get<any>('/user/salary-statistics', {year});
            return response.data;
        } catch (error) {
            console.error('급여 통계를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 근무 시간 통계 조회
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 근무 시간 통계 데이터
     */
    getWorkHourStatistics: async (year: string, month?: number): Promise<any> => {
        try {
            const params: any = {year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<any>('/user/work-hour-statistics', params);
            return response.data;
        } catch (error) {
            console.error('근무 시간 통계를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 명세서 다운로드
     * @param salaryId 급여 기록 ID
     * @returns 급여 명세서 URL
     */
    downloadSalaryStatement: async (salaryId: string): Promise<string> => {
        try {
            const response = await api.get<{ url: string }>(`/user/salary-records/${salaryId}/statement`);
            return response.data.url;
        } catch (error) {
            console.error('급여 명세서를 다운로드하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default userProfileService;
