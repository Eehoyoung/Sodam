/**
 * 급여 관리 관련 서비스
 * 급여 정보 조회, 생성, 수정, 삭제 및 통계 기능을 제공합니다.
 */

import api from '../../../common/utils/api';
import {
    SalaryRecord,
    SalaryStatus,
    SalaryStatistics,
    SalaryFilter,
    CreateSalaryRequest,
    UpdateSalaryRequest,
    SalaryPolicy
} from '../types';

// 급여 관리 서비스 객체
const salaryService = {
    /**
     * 급여 목록 조회
     * @param filter 필터 조건
     * @returns 급여 목록
     */
    getSalaries: async (filter?: SalaryFilter): Promise<SalaryRecord[]> => {
        try {
            const response = await api.get<SalaryRecord[]>('/salary', filter);
            return response.data;
        } catch (error) {
            console.error('급여 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 특정 급여 정보 조회
     * @param salaryId 급여 ID
     * @returns 급여 정보
     */
    getSalaryById: async (salaryId: string): Promise<SalaryRecord> => {
        try {
            const response = await api.get<SalaryRecord>(`/salary/${salaryId}`);
            return response.data;
        } catch (error) {
            console.error('급여 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원별 급여 목록 조회
     * @param employeeId 직원 ID
     * @param filter 필터 조건
     * @returns 급여 목록
     */
    getEmployeeSalaries: async (employeeId: string, filter?: SalaryFilter): Promise<SalaryRecord[]> => {
        try {
            const params = {...filter, employeeId};
            const response = await api.get<SalaryRecord[]>('/salary/employee', params);
            return response.data;
        } catch (error) {
            console.error('직원 급여 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 매장별 급여 목록 조회
     * @param workplaceId 매장 ID
     * @param filter 필터 조건
     * @returns 급여 목록
     */
    getWorkplaceSalaries: async (workplaceId: string, filter?: SalaryFilter): Promise<SalaryRecord[]> => {
        try {
            const params = {...filter, workplaceId};
            const response = await api.get<SalaryRecord[]>('/salary/workplace', params);
            return response.data;
        } catch (error) {
            console.error('매장 급여 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 생성
     * @param salaryData 급여 데이터
     * @returns 생성된 급여 정보
     */
    createSalary: async (salaryData: CreateSalaryRequest): Promise<SalaryRecord> => {
        try {
            const response = await api.post<SalaryRecord>('/salary', salaryData);
            return response.data;
        } catch (error) {
            console.error('급여를 생성하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 수정
     * @param salaryId 급여 ID
     * @param salaryData 수정할 급여 데이터
     * @returns 수정된 급여 정보
     */
    updateSalary: async (salaryId: string, salaryData: UpdateSalaryRequest): Promise<SalaryRecord> => {
        try {
            const response = await api.put<SalaryRecord>(`/salary/${salaryId}`, salaryData);
            return response.data;
        } catch (error) {
            console.error('급여 정보를 수정하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 삭제
     * @param salaryId 급여 ID
     */
    deleteSalary: async (salaryId: string): Promise<void> => {
        try {
            await api.delete(`/salary/${salaryId}`);
        } catch (error) {
            console.error('급여를 삭제하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 상태 업데이트
     * @param salaryId 급여 ID
     * @param status 변경할 상태
     * @param paymentDate 지급일 (PAID 상태로 변경 시 필요)
     * @returns 업데이트된 급여 정보
     */
    updateSalaryStatus: async (salaryId: string, status: SalaryStatus, paymentDate?: string): Promise<SalaryRecord> => {
        try {
            const data: any = {status};
            if (status === SalaryStatus.PAID && paymentDate) {
                data.paymentDate = paymentDate;
            }

            const response = await api.put<SalaryRecord>(`/salary/${salaryId}/status`, data);
            return response.data;
        } catch (error) {
            console.error('급여 상태를 업데이트하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 일괄 급여 생성
     * @param workplaceId 매장 ID
     * @param period 급여 기간 (YYYY-MM)
     * @returns 생성된 급여 목록
     */
    batchCreateSalaries: async (workplaceId: string, period: string): Promise<SalaryRecord[]> => {
        try {
            const response = await api.post<SalaryRecord[]>('/salary/batch', {workplaceId, period});
            return response.data;
        } catch (error) {
            console.error('일괄 급여 생성 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 일괄 급여 지급
     * @param salaryIds 급여 ID 배열
     * @param paymentDate 지급일
     * @returns 업데이트된 급여 목록
     */
    batchPaySalaries: async (salaryIds: string[], paymentDate: string): Promise<SalaryRecord[]> => {
        try {
            const response = await api.post<SalaryRecord[]>('/salary/batch-pay', {salaryIds, paymentDate});
            return response.data;
        } catch (error) {
            console.error('일괄 급여 지급 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 명세서 생성
     * @param salaryId 급여 ID
     * @returns 명세서 URL
     */
    generateSalaryStatement: async (salaryId: string): Promise<string> => {
        try {
            const response = await api.get<{ url: string }>(`/salary/${salaryId}/statement`);
            return response.data.url;
        } catch (error) {
            console.error('급여 명세서 생성 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 일괄 급여 명세서 생성
     * @param salaryIds 급여 ID 배열
     * @returns 압축 파일 URL
     */
    batchGenerateSalaryStatements: async (salaryIds: string[]): Promise<string> => {
        try {
            const response = await api.post<{ url: string }>('/salary/batch-statements', {salaryIds});
            return response.data.url;
        } catch (error) {
            console.error('일괄 급여 명세서 생성 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 통계 조회
     * @param workplaceId 매장 ID
     * @param year 연도 (YYYY)
     * @returns 급여 통계
     */
    getSalaryStatistics: async (workplaceId: string, year: string): Promise<SalaryStatistics> => {
        try {
            const response = await api.get<SalaryStatistics>('/salary/statistics', {workplaceId, year});
            return response.data;
        } catch (error) {
            console.error('급여 통계를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 정책 조회
     * @param workplaceId 매장 ID
     * @returns 급여 정책
     */
    getSalaryPolicy: async (workplaceId: string): Promise<SalaryPolicy> => {
        try {
            const response = await api.get<SalaryPolicy>(`/salary/policy/${workplaceId}`);
            return response.data;
        } catch (error) {
            console.error('급여 정책을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 정책 업데이트
     * @param workplaceId 매장 ID
     * @param policyData 정책 데이터
     * @returns 업데이트된 급여 정책
     */
    updateSalaryPolicy: async (workplaceId: string, policyData: Partial<SalaryPolicy>): Promise<SalaryPolicy> => {
        try {
            const response = await api.put<SalaryPolicy>(`/salary/policy/${workplaceId}`, policyData);
            return response.data;
        } catch (error) {
            console.error('급여 정책을 업데이트하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 급여 계산
     * @param workplaceId 매장 ID
     * @param employeeId 직원 ID
     * @param startDate 시작일
     * @param endDate 종료일
     * @returns 계산된 급여 정보
     */
    calculateSalary: async (workplaceId: string, employeeId: string, startDate: string, endDate: string): Promise<any> => {
        try {
            const response = await api.post<any>('/salary/calculate', {workplaceId, employeeId, startDate, endDate});
            return response.data;
        } catch (error) {
            console.error('급여 계산 중 오류가 발생했습니다:', error);
            throw error;
        }
    }
};

export default salaryService;
