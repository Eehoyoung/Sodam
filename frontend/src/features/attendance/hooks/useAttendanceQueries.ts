import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import attendanceService from '../services/attendanceService';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';
import {
    AttendanceFilter,
    AttendanceRecord,
    AttendanceStatistics,
    AttendanceStatus,
    CheckInRequest,
    CheckOutRequest,
    UpdateAttendanceRequest
} from '../types';

/**
 * 근태 관리 관련 TanStack Query 훅들
 * 백엔드 Redis 캐싱과 연계한 최적화된 근태 데이터 관리
 * 실시간성이 중요한 근태 데이터의 특성을 고려한 캐시 전략 적용
 */

/**
 * 출퇴근 기록 목록 조회 쿼리
 * 필터 조건에 따른 출퇴근 기록을 가져옵니다.
 */
export const useAttendanceRecords = (filter: AttendanceFilter) => {
    return useQuery({
        queryKey: [...queryKeys.attendance.all, 'records', JSON.stringify(filter)],
        queryFn: async (): Promise<AttendanceRecord[]> => {
            try {
                return await attendanceService.getAttendanceRecords(filter);
            } catch (error) {
                handleQueryError(error, 'getAttendanceRecords');
                throw error;
            }
        },
        staleTime: 2 * 60 * 1000, // 2분 - 근태 데이터는 실시간성이 중요
        gcTime: 5 * 60 * 1000, // 5분
        enabled: !!(filter.startDate && filter.endDate), // 필수 필터가 있을 때만 활성화
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 404) {
                return false; // 데이터가 없는 경우 재시도하지 않음
            }
            return failureCount < 2;
        },
        meta: {
            errorMessage: '출퇴근 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 매장별 출퇴근 기록 조회 쿼리
 * 특정 매장의 모든 직원 출퇴근 기록을 가져옵니다.
 */
export const useStoreAttendance = (storeId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: queryKeys.attendance.store(storeId),
        queryFn: async (): Promise<AttendanceRecord[]> => {
            try {
                const filter: AttendanceFilter = {
                    startDate: new Date().toISOString().split('T')[0], // 오늘 날짜
                    endDate: new Date().toISOString().split('T')[0],
                    workplaceId: storeId.toString(),
                };
                return await attendanceService.getAttendanceRecords(filter);
            } catch (error) {
                handleQueryError(error, 'getStoreAttendance');
                throw error;
            }
        },
        staleTime: 1 * 60 * 1000, // 1분 - 매장 관리자용, 더 자주 업데이트
        gcTime: 3 * 60 * 1000, // 3분
        enabled: enabled && !!storeId,
        refetchInterval: 5 * 60 * 1000, // 5분마다 자동 갱신
        meta: {
            errorMessage: '매장 출퇴근 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 직원별 출퇴근 기록 조회 쿼리
 * 특정 직원의 출퇴근 기록을 가져옵니다.
 */
export const useEmployeeAttendance = (employeeId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: queryKeys.attendance.employee(employeeId),
        queryFn: async (): Promise<AttendanceRecord[]> => {
            try {
                const filter: AttendanceFilter = {
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 전
                    endDate: new Date().toISOString().split('T')[0], // 오늘
                    employeeId: employeeId.toString(),
                };
                return await attendanceService.getAttendanceRecords(filter);
            } catch (error) {
                handleQueryError(error, 'getEmployeeAttendance');
                throw error;
            }
        },
        staleTime: 3 * 60 * 1000, // 3분
        gcTime: 10 * 60 * 1000, // 10분
        enabled: enabled && !!employeeId,
        meta: {
            errorMessage: '직원 출퇴근 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 월별 직원 출퇴근 기록 조회 쿼리
 * 특정 직원의 월별 출퇴근 기록을 가져옵니다.
 */
export const useMonthlyEmployeeAttendance = (
    employeeId: number,
    year: number,
    month: number,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: queryKeys.attendance.monthly(employeeId, year, month),
        queryFn: async (): Promise<AttendanceRecord[]> => {
            try {
                const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
                const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 해당 월의 마지막 날

                const filter: AttendanceFilter = {
                    startDate,
                    endDate,
                    employeeId: employeeId.toString(),
                };
                return await attendanceService.getAttendanceRecords(filter);
            } catch (error) {
                handleQueryError(error, 'getMonthlyEmployeeAttendance');
                throw error;
            }
        },
        staleTime: 10 * 60 * 1000, // 10분 - 월별 데이터는 상대적으로 안정적
        gcTime: 30 * 60 * 1000, // 30분
        enabled: enabled && !!employeeId && !!year && !!month,
        meta: {
            errorMessage: '월별 출퇴근 기록을 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 특정 출퇴근 기록 조회 쿼리
 * 단일 출퇴근 기록의 상세 정보를 가져옵니다.
 */
export const useAttendanceRecord = (attendanceId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.attendance.all, 'record', String(attendanceId)],
        queryFn: async (): Promise<AttendanceRecord> => {
            try {
                return await attendanceService.getAttendanceById(attendanceId);
            } catch (error) {
                handleQueryError(error, 'getAttendanceById');
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 15 * 60 * 1000, // 15분
        enabled: enabled && !!attendanceId,
        meta: {
            errorMessage: '출퇴근 기록 상세 정보를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 현재 출퇴근 상태 조회 쿼리
 * 특정 직장에서의 현재 출퇴근 상태를 가져옵니다.
 */
export const useCurrentAttendance = (workplaceId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.attendance.all, 'current', String(workplaceId)],
        queryFn: async (): Promise<AttendanceRecord | null> => {
            try {
                return await attendanceService.getCurrentAttendance(workplaceId);
            } catch (error) {
                handleQueryError(error, 'getCurrentAttendance');
                throw error;
            }
        },
        staleTime: 30 * 1000, // 30초 - 현재 상태는 매우 자주 확인
        gcTime: 2 * 60 * 1000, // 2분
        enabled: enabled && !!workplaceId,
        refetchInterval: 60 * 1000, // 1분마다 자동 갱신
        meta: {
            errorMessage: '현재 출퇴근 상태를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 출퇴근 통계 조회 쿼리
 * 필터 조건에 따른 출퇴근 통계를 가져옵니다.
 */
export const useAttendanceStatistics = (filter: AttendanceFilter, enabled: boolean = true) => {
    return useQuery({
        queryKey: [...queryKeys.attendance.all, 'statistics', JSON.stringify(filter)],
        queryFn: async (): Promise<AttendanceStatistics> => {
            try {
                return await attendanceService.getAttendanceStatistics(filter);
            } catch (error) {
                handleQueryError(error, 'getAttendanceStatistics');
                throw error;
            }
        },
        staleTime: 15 * 60 * 1000, // 15분 - 통계는 상대적으로 안정적
        gcTime: 30 * 60 * 1000, // 30분
        enabled: enabled && !!(filter.startDate && filter.endDate),
        meta: {
            errorMessage: '출퇴근 통계를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 출근 뮤테이션
 * 출근 처리를 수행하고 관련 캐시를 업데이트합니다.
 */
export const useCheckIn = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (checkInData: CheckInRequest): Promise<AttendanceRecord> => {
            try {
                return await attendanceService.checkIn(checkInData);
            } catch (error) {
                handleQueryError(error, 'checkIn');
                throw error;
            }
        },
        onSuccess: (data: AttendanceRecord, variables: CheckInRequest) => {
            // 현재 출퇴근 상태 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.attendance.all, 'current', String(variables.workplaceId)],
                data
            );

            // 관련 쿼리들 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.store(parseInt(variables.workplaceId))
            });

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.attendance.employee(parseInt(data.employeeId))
                });
            }

            // 출퇴근 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 출근 처리 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 출근 처리 실패:', error);
        },
        meta: {
            errorMessage: '출근 처리에 실패했습니다.',
        },
    });
};

/**
 * 퇴근 뮤테이션
 * 퇴근 처리를 수행하고 관련 캐시를 업데이트합니다.
 */
export const useCheckOut = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ checkOutData }: { checkOutData: CheckOutRequest }): Promise<AttendanceRecord> => {
            try {
                return await attendanceService.checkOutStandard(checkOutData);
            } catch (error) {
                handleQueryError(error, 'checkOut');
                throw error;
            }
        },
        onSuccess: (data: AttendanceRecord, variables: { checkOutData: CheckOutRequest }) => {
            // 현재 출퇴근 상태 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.attendance.all, 'current', String(variables.checkOutData.workplaceId)],
                data
            );

            // 관련 쿼리들 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.store(parseInt(variables.checkOutData.workplaceId))
            });

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.attendance.employee(parseInt(data.employeeId))
                });
            }

            // 출퇴근 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 퇴근 처리 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 퇴근 처리 실패:', error);
        },
        meta: {
            errorMessage: '퇴근 처리에 실패했습니다.',
        },
    });
};

/**
 * 출퇴근 기록 수정 뮤테이션
 * 출퇴근 기록을 수정하고 관련 캐시를 업데이트합니다.
 */
export const useUpdateAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({attendanceId, updateData}: {
            attendanceId: string;
            updateData: UpdateAttendanceRequest
        }): Promise<AttendanceRecord> => {
            try {
                return await attendanceService.updateAttendance(attendanceId, updateData);
            } catch (error) {
                handleQueryError(error, 'updateAttendance');
                throw error;
            }
        },
        onSuccess: (data: AttendanceRecord, variables) => {
            // 특정 출퇴근 기록 캐시 업데이트
            queryClient.setQueryData(
                [...queryKeys.attendance.all, 'record', variables.attendanceId],
                data
            );

            // 관련 쿼리들 무효화
            if (data.workplaceId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.attendance.store(parseInt(data.workplaceId))
                });
            }

            if (data.employeeId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.attendance.employee(parseInt(data.employeeId))
                });
            }

            // 출퇴근 기록 목록 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all,
                predicate: (query) => query.queryKey.includes('records')
            });

            console.log('[TanStack Query] 출퇴근 기록 수정 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 출퇴근 기록 수정 실패:', error);
        },
        meta: {
            errorMessage: '출퇴근 기록 수정에 실패했습니다.',
        },
    });
};

/**
 * 출퇴근 기록 삭제 뮤테이션
 * 출퇴근 기록을 삭제하고 관련 캐시를 업데이트합니다.
 */
export const useDeleteAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (attendanceId: string): Promise<void> => {
            try {
                await attendanceService.deleteAttendance(attendanceId);
            } catch (error) {
                handleQueryError(error, 'deleteAttendance');
                throw error;
            }
        },
        onSuccess: (_, attendanceId) => {
            // 특정 출퇴근 기록 캐시 제거
            queryClient.removeQueries({
                queryKey: [...queryKeys.attendance.all, 'record', attendanceId]
            });

            // 모든 출퇴근 관련 목록 쿼리 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all,
                predicate: (query) =>
                    query.queryKey.includes('records') ||
                    query.queryKey.includes('store') ||
                    query.queryKey.includes('employee')
            });

            console.log('[TanStack Query] 출퇴근 기록 삭제 완료 - 캐시 업데이트');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 출퇴근 기록 삭제 실패:', error);
        },
        meta: {
            errorMessage: '출퇴근 기록 삭제에 실패했습니다.',
        },
    });
};

/**
 * 위치 기반 출퇴근 검증 뮤테이션
 * 위치 정보를 통해 출퇴근 가능 여부를 검증합니다.
 */
export const useVerifyLocationAttendance = () => {
    return useMutation({
        mutationFn: async ({
                               employeeId,
                               workplaceId,
                               latitude,
                               longitude
                           }: {
            employeeId: string;
            workplaceId: string;
            latitude: number;
            longitude: number;
        }) => {
            try {
                return await attendanceService.verifyLocationAttendance(
                    employeeId,
                    workplaceId,
                    latitude,
                    longitude
                );
            } catch (error) {
                handleQueryError(error, 'verifyLocationAttendance');
                throw error;
            }
        },
        meta: {
            errorMessage: '위치 기반 출퇴근 검증에 실패했습니다.',
        },
    });
};


/**
 * 출퇴근 상태 일괄 업데이트 뮤테이션
 * 여러 출퇴근 기록의 상태를 일괄적으로 업데이트합니다.
 */
export const useBatchUpdateAttendanceStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
                               attendanceIds,
                               status
                           }: {
            attendanceIds: string[];
            status: AttendanceStatus;
        }): Promise<AttendanceRecord[]> => {
            try {
                return await attendanceService.batchUpdateStatus(attendanceIds, status);
            } catch (error) {
                handleQueryError(error, 'batchUpdateStatus');
                throw error;
            }
        },
        onSuccess: () => {
            // 모든 출퇴근 관련 쿼리 무효화 (일괄 업데이트이므로)
            queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all
            });

            console.log('[TanStack Query] 출퇴근 상태 일괄 업데이트 완료 - 캐시 무효화');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 출퇴근 상태 일괄 업데이트 실패:', error);
        },
        meta: {
            errorMessage: '출퇴근 상태 일괄 업데이트에 실패했습니다.',
        },
    });
};
