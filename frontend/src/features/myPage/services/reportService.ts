import api from '../../../common/utils/api';

/**
 * 리포트 및 분석 관련 서비스
 * 데이터 분석 및 리포트 생성 기능을 제공합니다.
 */

// 리포트 서비스 객체
const reportService = {
    /**
     * 매장 운영 리포트 조회
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 매장 운영 리포트 데이터
     */
    getOperationReport: async (workplaceId: string, year: string, month?: number): Promise<any> => {
        try {
            const params: any = {workplaceId, year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<any>('/reports/operation', params);
            return response.data;
        } catch (error) {
            console.error('매장 운영 리포트를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 인건비 분석 리포트 조회
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 인건비 분석 리포트 데이터
     */
    getLaborCostReport: async (workplaceId: string, year: string, month?: number): Promise<any> => {
        try {
            const params: any = {workplaceId, year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<any>('/reports/labor-cost', params);
            return response.data;
        } catch (error) {
            console.error('인건비 분석 리포트를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 직원 근무 효율성 분석 리포트 조회
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 직원 근무 효율성 분석 리포트 데이터
     */
    getEmployeeEfficiencyReport: async (workplaceId: string, year: string, month?: number): Promise<any> => {
        try {
            const params: any = {workplaceId, year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<any>('/reports/employee-efficiency', params);
            return response.data;
        } catch (error) {
            console.error('직원 근무 효율성 분석 리포트를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 매장 운영 비용 분석 리포트 조회
     * @param workplaceId 근무지 ID
     * @param year 연도 (YYYY)
     * @param month 월 (1-12, 선택적)
     * @returns 매장 운영 비용 분석 리포트 데이터
     */
    getOperationCostReport: async (workplaceId: string, year: string, month?: number): Promise<any> => {
        try {
            const params: any = {workplaceId, year};
            if (month) {
                params.month = month;
            }

            const response = await api.get<any>('/reports/operation-cost', params);
            return response.data;
        } catch (error) {
            console.error('매장 운영 비용 분석 리포트를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 맞춤형 리포트 생성
     * @param workplaceId 근무지 ID
     * @param reportConfig 리포트 설정
     * @returns 맞춤형 리포트 데이터
     */
    generateCustomReport: async (workplaceId: string, reportConfig: any): Promise<any> => {
        try {
            const response = await api.post<any>('/reports/custom', {workplaceId, ...reportConfig});
            return response.data;
        } catch (error) {
            console.error('맞춤형 리포트를 생성하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 리포트 내보내기 (PDF)
     * @param reportType 리포트 유형 ('operation', 'labor-cost', 'employee-efficiency', 'operation-cost', 'custom')
     * @param reportId 리포트 ID (맞춤형 리포트인 경우에만 필요)
     * @param params 리포트 파라미터
     * @returns PDF 파일 URL
     */
    exportReportToPdf: async (reportType: string, reportId: string | null, params: any): Promise<string> => {
        try {
            const requestData: any = {reportType, ...params};
            if (reportId) {
                requestData.reportId = reportId;
            }

            const response = await api.post<{ url: string }>('/reports/export/pdf', requestData);
            return response.data.url;
        } catch (error) {
            console.error('리포트를 PDF로 내보내는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 리포트 내보내기 (Excel)
     * @param reportType 리포트 유형 ('operation', 'labor-cost', 'employee-efficiency', 'operation-cost', 'custom')
     * @param reportId 리포트 ID (맞춤형 리포트인 경우에만 필요)
     * @param params 리포트 파라미터
     * @returns Excel 파일 URL
     */
    exportReportToExcel: async (reportType: string, reportId: string | null, params: any): Promise<string> => {
        try {
            const requestData: any = {reportType, ...params};
            if (reportId) {
                requestData.reportId = reportId;
            }

            const response = await api.post<{ url: string }>('/reports/export/excel', requestData);
            return response.data.url;
        } catch (error) {
            console.error('리포트를 Excel로 내보내는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 대시보드 데이터 조회
     * @param workplaceId 근무지 ID
     * @returns 대시보드 데이터
     */
    getDashboardData: async (workplaceId: string): Promise<any> => {
        try {
            const response = await api.get<any>('/reports/dashboard', {workplaceId});
            return response.data;
        } catch (error) {
            console.error('대시보드 데이터를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 대시보드 커스터마이징 설정 저장
     * @param workplaceId 근무지 ID
     * @param dashboardConfig 대시보드 설정
     * @returns 업데이트된 대시보드 설정
     */
    saveDashboardConfig: async (workplaceId: string, dashboardConfig: any): Promise<any> => {
        try {
            const response = await api.post<any>('/reports/dashboard/config', {workplaceId, ...dashboardConfig});
            return response.data;
        } catch (error) {
            console.error('대시보드 설정을 저장하는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 대시보드 커스터마이징 설정 조회
     * @param workplaceId 근무지 ID
     * @returns 대시보드 설정
     */
    getDashboardConfig: async (workplaceId: string): Promise<any> => {
        try {
            const response = await api.get<any>('/reports/dashboard/config', {workplaceId});
            return response.data;
        } catch (error) {
            console.error('대시보드 설정을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default reportService;
