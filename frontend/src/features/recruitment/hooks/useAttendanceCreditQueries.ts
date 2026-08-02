import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {handleQueryError} from '../../../common/query/errorHandler';
import attendanceCreditService from '../services/attendanceCreditService';
import type {AttendanceCreditCheckInResult, AttendanceCreditSummary} from '../types';

/** 출근권(attendanceCredit) 쿼리 키 — feature가 직접 소유(useRecruitmentQueries.ts 패턴). */
export const attendanceCreditQueryKeys = {
    all: ['attendanceCredit'] as const,
    me: () => [...attendanceCreditQueryKeys.all, 'me'] as const,
};

/**
 * [사장] 내 출근권 현황 — GET /api/attendance-credits/me.
 * 홈 진입 팝업(`AttendanceCreditPopupHost`)과 마이페이지 카드(`AttendanceCreditSummaryCard`)가
 * 함께 구독하므로 staleTime을 짧게 둬 체크인 직후 캐시 무효화가 두 화면 모두에 즉시 반영되게 한다.
 */
export const useAttendanceCreditSummary = (enabled: boolean = true) =>
    useQuery({
        queryKey: attendanceCreditQueryKeys.me(),
        queryFn: async (): Promise<AttendanceCreditSummary> => {
            try {
                return await attendanceCreditService.getMySummary();
            } catch (error) {
                handleQueryError(error, 'getAttendanceCreditSummary');
                throw error;
            }
        },
        enabled,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        meta: {errorMessage: '출근권 현황을 가져오는데 실패했어요.'},
    });

/**
 * [사장] 오늘 출석체크 — POST /api/attendance-credits/check-in.
 * 하루 1회만 가능하며 중복 시 BE가 409를 반환한다(호출측에서 status 분기 처리).
 * 성공/충돌(409) 모두 잔액·오늘출석여부가 바뀔 수 있어 항상 /me 캐시를 무효화한다.
 */
export const useAttendanceCreditCheckIn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<AttendanceCreditCheckInResult> => {
            try {
                return await attendanceCreditService.checkIn();
            } catch (error) {
                handleQueryError(error, 'attendanceCreditCheckIn');
                throw error;
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: attendanceCreditQueryKeys.me()});
        },
        meta: {errorMessage: '출석 체크에 실패했어요.'},
    });
};
