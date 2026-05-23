import api from '../../../common/utils/api';
import {SalaryRecord, SalaryStatistics, SalaryPolicy, UpdateSalaryStatusData} from '../types';
import {logger} from '../../../utils/logger';

/**
 * 급여 관리 관련 서비스
 * 매니저와 마스터를 위한 급여 관리 기능을 제공합니다.
 */

// 급여 관리 서비스 객체
const salaryManagementService = {
    /**
     * 직원 급여 목록 조회 (매니저/마스터용)
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 직원 급여 목록
     */
    getEmployeeSalaries: async (workplaceId: string, year: string, month?: number): Promise<SalaryRecord[]> => {
        try {
            const params: { workplaceId: string; year: string; month?: number } = {workplaceId, year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<SalaryRecord[]>('/salary/employees', params);
            return response.data;
        } catch (error) {
            logger.error('직원 급여 목록을 가져오는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 특정 직원의 급여 기록 조회 (매니저/마스터용)
     * @param employeeId 직원 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 직원 급여 기록 목록
     */
    getEmployeeSalaryHistory: async (employeeId: string, year: string, month?: number): Promise<SalaryRecord[]> => {
        try {
            const params: { year: string; month?: number } = {year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<SalaryRecord[]>(`/salary/employees/${employeeId}/history`, params);
            return response.data;
        } catch (error) {
            logger.error('직원 급여 기록을 가져오는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 생성 (매니저/마스터용)
     * @param salaryData 급여 데이터
     * @returns 생성된 급여 기록
     */
    createSalary: async (salaryData: Omit<SalaryRecord, 'id'>): Promise<SalaryRecord> => {
        try {
            const response = await api.post<SalaryRecord>('/salary', salaryData);
            return response.data;
        } catch (error) {
            logger.error('급여를 생성하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 수정 (매니저/마스터용)
     * @param salaryId 급여 ID
     * @param salaryData 수정할 급여 데이터
     * @returns 수정된 급여 기록
     */
    updateSalary: async (salaryId: string, salaryData: Partial<SalaryRecord>): Promise<SalaryRecord> => {
        try {
            const response = await api.put<SalaryRecord>(`/salary/${salaryId}`, salaryData);
            return response.data;
        } catch (error) {
            logger.error('급여를 수정하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 삭제 (마스터용)
     * @param salaryId 급여 ID
     */
    deleteSalary: async (salaryId: string): Promise<void> => {
        try {
            await api.delete(`/salary/${salaryId}`);
        } catch (error) {
            logger.error('급여를 삭제하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 지급 상태 변경 (매니저/마스터용)
     * @param salaryId 급여 ID
     * @param status 지급 상태 ('PENDING' | 'PAID')
     * @param paymentDate 지급일 (YYYY-MM-DD, 'PAID' 상태인 경우에만 필요)
     * @returns 업데이트된 급여 기록
     */
    updateSalaryStatus: async (salaryId: string, status: 'PENDING' | 'PAID', paymentDate?: string): Promise<SalaryRecord> => {
        try {
            const data: UpdateSalaryStatusData = {status};
            if (status === 'PAID' && paymentDate) {
                data.paymentDate = paymentDate;
            }

            const response = await api.put<SalaryRecord>(`/salary/${salaryId}/status`, data);
            return response.data;
        } catch (error) {
            logger.error('급여 지급 상태를 변경하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 일괄 생성 (매니저/마스터용)
     * @param workplaceId 근무지 ID
     * @param period 급여 기간 (YYYY-MM)
     * @returns 생성된 급여 기록 목록
     */
    batchCreateSalaries: async (workplaceId: string, period: string): Promise<SalaryRecord[]> => {
        try {
            const response = await api.post<SalaryRecord[]>('/salary/batch', {workplaceId, period});
            return response.data;
        } catch (error) {
            logger.error('급여를 일괄 생성하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 일괄 지급 (매니저/마스터용)
     * @param salaryIds 급여 ID 배열
     * @param paymentDate 지급일 (YYYY-MM-DD)
     * @returns 업데이트된 급여 기록 목록
     */
    batchPaySalaries: async (salaryIds: string[], paymentDate: string): Promise<SalaryRecord[]> => {
        try {
            const response = await api.post<SalaryRecord[]>('/salary/batch-pay', {salaryIds, paymentDate});
            return response.data;
        } catch (error) {
            logger.error('급여를 일괄 지급하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 명세서 생성 (매니저/마스터용)
     * @param salaryId 급여 ID
     * @returns 생성된 급여 명세서 URL
     */
    generateSalaryStatement: async (salaryId: string): Promise<string> => {
        try {
            const response = await api.post<{ url: string }>(`/salary/${salaryId}/statement`);
            return response.data.url;
        } catch (error) {
            logger.error('급여 명세서를 생성하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 명세서 일괄 생성 (매니저/마스터용)
     * @param salaryIds 급여 ID 배열
     * @returns 생성된 급여 명세서 ZIP 파일 URL
     */
    batchGenerateSalaryStatements: async (salaryIds: string[]): Promise<string> => {
        try {
            const response = await api.post<{ url: string }>('/salary/batch-statements', {salaryIds});
            return response.data.url;
        } catch (error) {
            logger.error('급여 명세서를 일괄 생성하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 통계 조회 (매니저/마스터용)
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @returns 급여 통계 데이터
     */
    getSalaryStatistics: async (workplaceId: string, year: string): Promise<SalaryStatistics> => {
        try {
            const response = await api.get<SalaryStatistics>('/salary/statistics', {workplaceId, year});
            return response.data;
        } catch (error) {
            logger.error('급여 통계를 가져오는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 정책 조회 (매니저/마스터용)
     * @param workplaceId 근무지 ID
     * @returns 급여 정책 데이터
     */
    getSalaryPolicy: async (workplaceId: string): Promise<SalaryPolicy> => {
        try {
            const response = await api.get<SalaryPolicy>(`/salary/policy/${workplaceId}`);
            return response.data;
        } catch (error) {
            logger.error('급여 정책을 가져오는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },

    /**
     * 급여 정책 업데이트 (마스터용)
     * @param workplaceId 근무지 ID
     * @param policyData 급여 정책 데이터
     * @returns 업데이트된 급여 정책 데이터
     */
    updateSalaryPolicy: async (workplaceId: string, policyData: Partial<SalaryPolicy>): Promise<SalaryPolicy> => {
        try {
            const response = await api.put<SalaryPolicy>(`/salary/policy/${workplaceId}`, policyData);
            return response.data;
        } catch (error) {
            logger.error('급여 정책을 업데이트하는 중 오류가 발생했습니다', 'SALARY_SERVICE', error);
            throw error;
        }
    },
};

export default salaryManagementService;
