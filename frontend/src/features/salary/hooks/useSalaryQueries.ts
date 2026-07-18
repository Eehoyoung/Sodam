import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';
import payrollService, {
    PayrollCalculatePayload,
    PayrollDetailItem,
    PayrollStatusValue,
    PayrollSummary,
} from '../services/payrollService';

/**
 * 급여(정산) TanStack Query 훅 — /api/payroll/* 정합.
 *
 * [드리프트 제거] 과거 이 파일은 BE 미존재 /salary/* 호출(salaryService)에 의존했다.
 * 실제 BE(PayrollController)에 대응되는 작업만 남기고 payrollService 로 위임한다.
 */

/** 매장별 급여 목록 — GET /api/payroll/store/{storeId} */
export const useStorePayrolls = (storeId: number, startDate?: string, endDate?: string, enabled = true) =>
    useQuery({
        queryKey: [...queryKeys.salary.store(storeId), 'records', startDate ?? '', endDate ?? ''],
        queryFn: async (): Promise<PayrollSummary[]> => {
            try {
                return await payrollService.listByStore(storeId, startDate, endDate);
            } catch (error) {
                handleQueryError(error, 'listByStore');
                throw error;
            }
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 45 * 60 * 1000,
        enabled: enabled && !!storeId,
        meta: {errorMessage: '매장 급여 기록을 가져오는데 실패했습니다.'},
    });

/** 직원별 급여 목록 — GET /api/payroll/employee/{employeeId} */
export const useEmployeePayrolls = (employeeId: number, startDate?: string, endDate?: string, enabled = true) =>
    useQuery({
        queryKey: [...queryKeys.salary.all, 'employee', employeeId, startDate ?? '', endDate ?? ''],
        queryFn: async (): Promise<PayrollSummary[]> => {
            try {
                return await payrollService.listByEmployee(employeeId, startDate, endDate);
            } catch (error) {
                handleQueryError(error, 'listByEmployee');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        enabled: enabled && !!employeeId,
        meta: {errorMessage: '직원 급여 기록을 가져오는데 실패했습니다.'},
    });

/** 급여 단건 요약(실수령액/기간/상태) — GET /api/payroll/{payrollId} */
export const usePayroll = (payrollId: number, enabled = true) =>
    useQuery({
        queryKey: [...queryKeys.salary.all, 'summary', payrollId],
        queryFn: async (): Promise<PayrollSummary> => {
            try {
                return await payrollService.getById(payrollId);
            } catch (error) {
                handleQueryError(error, 'getById');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        enabled: enabled && !!payrollId,
        meta: {errorMessage: '급여 정보를 가져오는데 실패했습니다.'},
    });

/** 급여 상세(근무일별 배열) — GET /api/payroll/{payrollId}/details */
export const usePayrollDetails = (payrollId: number, enabled = true) =>
    useQuery({
        queryKey: [...queryKeys.salary.all, 'details', payrollId],
        queryFn: async (): Promise<PayrollDetailItem[]> => {
            try {
                return await payrollService.getDetails(payrollId);
            } catch (error) {
                handleQueryError(error, 'getDetails');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        enabled: enabled && !!payrollId,
        meta: {errorMessage: '급여 상세 정보를 가져오는데 실패했습니다.'},
    });

/** 급여 계산 — POST /api/payroll/calculate */
export const useCalculatePayroll = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: PayrollCalculatePayload): Promise<PayrollSummary> => {
            try {
                return await payrollService.calculate(payload);
            } catch (error) {
                handleQueryError(error, 'calculatePayroll');
                throw error;
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({queryKey: queryKeys.salary.store(variables.storeId)});
        },
        meta: {errorMessage: '급여 계산에 실패했습니다.'},
    });
};

/** 급여 상태 변경 — PUT /api/payroll/{payrollId}/status */
export const useUpdatePayrollStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({payrollId, status}: {payrollId: number; status: PayrollStatusValue}): Promise<{success: boolean}> => {
            try {
                return await payrollService.updateStatus(payrollId, status);
            } catch (error) {
                handleQueryError(error, 'updatePayrollStatus');
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKeys.salary.all});
        },
        meta: {errorMessage: '급여 상태 업데이트에 실패했습니다.'},
    });
};
