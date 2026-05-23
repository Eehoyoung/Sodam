import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import salaryService from '../services/salaryService';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';
import {
    CreateSalaryRequest,
    SalaryFilter,
    SalaryPolicy,
    SalaryRecord,
    SalaryStatistics,
    SalaryStatus,
    UpdateSalaryRequest
} from '../types';

/**
 * 급여 관리 관련 TanStack Query 훅들
 * 백엔드 Redis 캐싱과 연계한 최적화된 급여 데이터 관리
 * 급여 데이터는 상대적으로 안정적이므로 긴 캐시 시간 적용
 */

/**
 * 급여 기록 목록 조회 쿼리
 * 필터 조건에 따른 급여 기록을 가져옵니다.
 */
export const useSalaryRecords = (filter?: SalaryFilter, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.salary.all, 'records', JSON.stringify(filter || {})],
        queryFn: async (): Promise<SalaryRecord[]> => {
            try {
                return await salaryService.getSalaries(filter);
            } catch (error) {
                handleQueryError(error, 'getSalaries');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000, // 30분 - 급여 데이터는 자주 변경되지 않음
        gcTime: 60 * 60 * 1000, // 1시간
        enabled: enabled,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 404) {
                return false; // 데이터가 없는 경우 재시도하지 않음
            }
            return failureCount < 2;
        },
        meta: {
            errorMessage: '급여 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 직원별 급여 기록 조회 쿼리
 * 특정 직원의 급여 기록을 가져옵니다.
 */
export const useEmployeeSalary = (
    employeeId: number,
    year: number,
    month: number,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: queryKeys.salary.employee(employeeId, year, month),
        queryFn: async (): Promise<SalaryRecord[]> => {
            try {
                const filter: SalaryFilter = {
                    employeeId: employeeId.toString(),
                    period: `${year}-${month.toString().padStart(2, '0')}`,
                };
                return await salaryService.getEmployeeSalaries(employeeId.toString(), filter);
            } catch (error) {
                handleQueryError(error, 'getEmployeeSalary');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000, // 30분
        gcTime: 60 * 60 * 1000, // 1시간
        enabled: enabled && !!employeeId && !!year && !!month,
        meta: {
            errorMessage: '직원 급여 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 매장별 급여 기록 조회 쿼리
 * 특정 매장의 모든 직원 급여 기록을 가져옵니다.
 */
export const useStoreSalary = (storeId: number, filter?: SalaryFilter, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.salary.store(storeId), 'records', JSON.stringify(filter || {})],
        queryFn: async (): Promise<SalaryRecord[]> => {
            try {
                const storeFilter: SalaryFilter = {
                    ...filter,
                    workplaceId: storeId.toString(),
                };
                return await salaryService.getWorkplaceSalaries(storeId.toString(), storeFilter);
            } catch (error) {
                handleQueryError(error, 'getStoreSalary');
                throw error;
            }
        },
        staleTime: 15 * 60 * 1000, // 15분 - 매장 관리자용
        gcTime: 45 * 60 * 1000, // 45분
        enabled: enabled && !!storeId,
        meta: {
            errorMessage: '매장 급여 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 특정 급여 기록 조회 쿼리
 * 단일 급여 기록의 상세 정보를 가져옵니다.
 */
export const useSalaryRecord = (salaryId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.salary.all, 'record', salaryId],
        queryFn: async (): Promise<SalaryRecord> => {
            try {
                return await salaryService.getSalaryById(salaryId);
            } catch (error) {
                handleQueryError(error, 'getSalaryById');
                throw error;
            }
        },
        staleTime: 30 * 60 * 1000, // 30분
        gcTime: 60 * 60 * 1000, // 1시간
        enabled: enabled && !!salaryId,
        meta: {
            errorMessage: '급여 기록 상세 정보를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 급여 통계 조회 쿼리
 * 특정 매장의 급여 통계를 가져옵니다.
 */
export const useSalaryStatistics = (workplaceId: string, year: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.salary.all, 'statistics', workplaceId, year],
        queryFn: async (): Promise<SalaryStatistics> => {
            try {
                return await salaryService.getSalaryStatistics(workplaceId, year);
            } catch (error) {
                handleQueryError(error, 'getSalaryStatistics');
                throw error;
            }
        },
        staleTime: 60 * 60 * 1000, // 1시간 - 통계는 매우 안정적
        gcTime: 2 * 60 * 60 * 1000, // 2시간
        enabled: enabled && !!workplaceId && !!year,
        meta: {
            errorMessage: '급여 통계를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 급여 정책 조회 쿼리
 * 특정 매장의 급여 정책을 가져옵니다.
 */
export const useSalaryPolicy = (workplaceId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.salary.all, 'policy', workplaceId],
        queryFn: async (): Promise<SalaryPolicy> => {
            try {
                return await salaryService.getSalaryPolicy(workplaceId);
            } catch (error) {
                handleQueryError(error, 'getSalaryPolicy');
                throw error;
            }
        },
        staleTime: 60 * 60 * 1000, // 1시간 - 정책은 자주 변경되지 않음
        gcTime: 2 * 60 * 60 * 1000, // 2시간
        enabled: enabled && !!workplaceId,
        meta: {
            errorMessage: '급여 정책을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 급여 계산 쿼리
 * 특정 기간의 급여를 계산합니다.
 */
export const useSalaryCalculation = (
    workplaceId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: [...queryKeys.salary.all, 'calculation', workplaceId, employeeId, startDate, endDate],
        queryFn: async (): Promise<SalaryRecord> => {
            try {
                return await salaryService.calculateSalary(workplaceId, employeeId, startDate, endDate);
            } catch (error) {
                handleQueryError(error, 'calculateSalary');
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5분 - 계산 결과는 상대적으로 짧은 캐시
        gcTime: 15 * 60 * 1000, // 15분
        enabled: enabled && !!workplaceId && !!employeeId && !!startDate && !!endDate,
        meta: {
            errorMessage: '급여 계산에 실패했습니다.',
        },
    });
};

/**
 * 급여 생성 뮤테이션
 * 새로운 급여 기록을 생성하고 관련 캐시를 업데이트합니다.
 */
export const useCreateSalary = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (salaryData: CreateSalaryRequest): Promise<SalaryRecord> => {
            try {
                return await salaryService.createSalary(salaryData);
            } catch (error) {
                handleQueryError(error, 'createSalary');
                throw error;
            }
        },
        onSuccess: (data: SalaryRecord) => {
            // 새로운 급여 기록 캐시 설정
            queryClient.setQueryData(
                [...queryKeys.salary.all, 'record', data.id],
                data
            );

            // 관련 쿼리들 무효화
            if (data.workplaceId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.store(parseInt(data.workplaceId))
                });
            }

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.all,
                    predicate: (query) =>
                        query.queryKey.includes('employee') &&
                        query.queryKey.includes(parseInt(data.employeeId))
                });
            }

            // 급여 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 급여 생성 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 생성 실패:', error);
        },
        meta: {
            errorMessage: '급여 생성에 실패했습니다.',
        },
    });
};

/**
 * 급여 수정 뮤테이션
 * 급여 기록을 수정하고 관련 캐시를 업데이트합니다.
 */
export const useUpdateSalary = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({salaryId, salaryData}: {
            salaryId: string;
            salaryData: UpdateSalaryRequest
        }): Promise<SalaryRecord> => {
            try {
                return await salaryService.updateSalary(salaryId, salaryData);
            } catch (error) {
                handleQueryError(error, 'updateSalary');
                throw error;
            }
        },
        onSuccess: (data: SalaryRecord, variables) => {
            // 특정 급여 기록 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.salary.all, 'record', variables.salaryId],
                data
            );

            // 관련 쿼리들 무효화
            if (data.workplaceId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.store(parseInt(data.workplaceId))
                });
            }

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.all,
                    predicate: (query) =>
                        query.queryKey.includes('employee') &&
                        query.queryKey.includes(parseInt(data.employeeId))
                });
            }

            // 급여 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 급여 수정 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 수정 실패:', error);
        },
        meta: {
            errorMessage: '급여 수정에 실패했습니다.',
        },
    });
};

/**
 * 급여 삭제 뮤테이션
 * 급여 기록을 삭제하고 관련 캐시를 업데이트합니다.
 */
export const useDeleteSalary = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (salaryId: string): Promise<void> => {
            try {
                await salaryService.deleteSalary(salaryId);
            } catch (error) {
                handleQueryError(error, 'deleteSalary');
                throw error;
            }
        },
        onSuccess: (_, salaryId) => {
            // 특정 급여 기록 캐시 제거
            queryClient.removeQueries({
                queryKey: [...queryKeys.salary.all, 'record', salaryId]
            });

            // 모든 급여 관련 목록 쿼리 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all,
                predicate: (query) =>
                    query.queryKey.includes('records') ||
                    query.queryKey.includes('store') ||
                    query.queryKey.includes('employee')
            });

            console.log('[TanStack Query] 급여 삭제 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 삭제 실패:', error);
        },
        meta: {
            errorMessage: '급여 삭제에 실패했습니다.',
        },
    });
};

/**
 * 급여 상태 업데이트 뮤테이션
 * 급여 지급 상태를 업데이트하고 관련 캐시를 업데이트합니다.
 */
export const useUpdateSalaryStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               salaryId,
                               status,
                               paymentDate
                           }: {
            salaryId: string;
            status: SalaryStatus;
            paymentDate?: string;
        }): Promise<SalaryRecord> => {
            try {
                return await salaryService.updateSalaryStatus(salaryId, status, paymentDate);
            } catch (error) {
                handleQueryError(error, 'updateSalaryStatus');
                throw error;
            }
        },
        onSuccess: (data: SalaryRecord, variables) => {
            // 특정 급여 기록 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.salary.all, 'record', variables.salaryId],
                data
            );

            // 관련 쿼리들 무효화
            if (data.workplaceId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.store(parseInt(data.workplaceId))
                });

                // 통계도 무효화 (지급 상태 변경으로 통계 영향)
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.all,
                    predicate: (query) =>
                        query.queryKey.includes('statistics') &&
                        query.queryKey.includes(data.workplaceId)
                });
            }

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.salary.all,
                    predicate: (query) =>
                        query.queryKey.includes('employee') &&
                        query.queryKey.includes(parseInt(data.employeeId))
                });
            }

            console.log('[TanStack Query] 급여 상태 업데이트 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 상태 업데이트 실패:', error);
        },
        meta: {
            errorMessage: '급여 상태 업데이트에 실패했습니다.',
        },
    });
};

/**
 * 급여 일괄 생성 뮤테이션
 * 특정 기간의 급여를 일괄 생성하고 관련 캐시를 업데이트합니다.
 */
export const useBatchCreateSalaries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               workplaceId,
                               period
                           }: {
            workplaceId: string;
            period: string;
        }): Promise<SalaryRecord[]> => {
            try {
                return await salaryService.batchCreateSalaries(workplaceId, period);
            } catch (error) {
                handleQueryError(error, 'batchCreateSalaries');
                throw error;
            }
        },
        onSuccess: (data: SalaryRecord[], variables) => {
            // 생성된 급여 기록들을 개별적으로 캐시 설정
            data.forEach(salary => {
                queryClient.setQueryData(
                    [...queryKeys.salary.all, 'record', salary.id],
                    salary
                );
            });

            // 해당 매장의 모든 급여 관련 쿼리 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.store(parseInt(variables.workplaceId))
            });

            // 모든 급여 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 급여 일괄 생성 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 일괄 생성 실패:', error);
        },
        meta: {
            errorMessage: '급여 일괄 생성에 실패했습니다.',
        },
    });
};

/**
 * 급여 일괄 지급 뮤테이션
 * 여러 급여를 일괄적으로 지급 처리하고 관련 캐시를 업데이트합니다.
 */
export const useBatchPaySalaries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               salaryIds,
                               paymentDate
                           }: {
            salaryIds: string[];
            paymentDate: string;
        }): Promise<SalaryRecord[]> => {
            try {
                return await salaryService.batchPaySalaries(salaryIds, paymentDate);
            } catch (error) {
                handleQueryError(error, 'batchPaySalaries');
                throw error;
            }
        },
        onSuccess: (data: SalaryRecord[]) => {
            // 업데이트된 급여 기록들을 개별적으로 캐시 업데이트
            data.forEach(salary => {
                queryClient.setQueryData(
                    [...queryKeys.salary.all, 'record', salary.id],
                    salary
                );
            });

            // 모든 급여 관련 쿼리 무효화 (일괄 처리이므로)
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all
            });

            console.log('[TanStack Query] 급여 일괄 지급 완료 - 캐시 무효화');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 일괄 지급 실패:', error);
        },
        meta: {
            errorMessage: '급여 일괄 지급에 실패했습니다.',
        },
    });
};

/**
 * 급여 정책 업데이트 뮤테이션
 * 매장의 급여 정책을 업데이트하고 관련 캐시를 업데이트합니다.
 */
export const useUpdateSalaryPolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               workplaceId,
                               policyData
                           }: {
            workplaceId: string;
            policyData: Partial<SalaryPolicy>;
        }): Promise<SalaryPolicy> => {
            try {
                return await salaryService.updateSalaryPolicy(workplaceId, policyData);
            } catch (error) {
                handleQueryError(error, 'updateSalaryPolicy');
                throw error;
            }
        },
        onSuccess: (data: SalaryPolicy, variables) => {
            // 급여 정책 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.salary.all, 'policy', variables.workplaceId],
                data
            );

            // 해당 매장의 급여 계산 관련 캐시 무효화 (정책 변경으로 계산 결과 영향)
            queryClient.invalidateQueries({
                queryKey: queryKeys.salary.all,
                predicate: (query) =>
                    query.queryKey.includes('calculation') &&
                    query.queryKey.includes(variables.workplaceId)
            });

            console.log('[TanStack Query] 급여 정책 업데이트 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여 정책 업데이트 실패:', error);
        },
        meta: {
            errorMessage: '급여 정책 업데이트에 실패했습니다.',
        },
    });
};

/**
 * 급여명세서 생성 뮤테이션
 * 급여명세서를 생성하고 다운로드 URL을 반환합니다.
 */
export const useGenerateSalaryStatement = () => {
    return useMutation({
        mutationFn: async (salaryId: string): Promise<string> => {
            try {
                return await salaryService.generateSalaryStatement(salaryId);
            } catch (error) {
                handleQueryError(error, 'generateSalaryStatement');
                throw error;
            }
        },
        onSuccess: (downloadUrl: string) => {
            console.log('[TanStack Query] 급여명세서 생성 완료:', downloadUrl);
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여명세서 생성 실패:', error);
        },
        meta: {
            errorMessage: '급여명세서 생성에 실패했습니다.',
        },
    });
};

/**
 * 급여명세서 일괄 생성 뮤테이션
 * 여러 급여명세서를 일괄 생성하고 다운로드 URL을 반환합니다.
 */
export const useBatchGenerateSalaryStatements = () => {
    return useMutation({
        mutationFn: async (salaryIds: string[]): Promise<string> => {
            try {
                return await salaryService.batchGenerateSalaryStatements(salaryIds);
            } catch (error) {
                handleQueryError(error, 'batchGenerateSalaryStatements');
                throw error;
            }
        },
        onSuccess: (downloadUrl: string) => {
            console.log('[TanStack Query] 급여명세서 일괄 생성 완료:', downloadUrl);
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 급여명세서 일괄 생성 실패:', error);
        },
        meta: {
            errorMessage: '급여명세서 일괄 생성에 실패했습니다.',
        },
    });
};
