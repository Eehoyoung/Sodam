import api from '../../../common/api/client';
import type {AttendanceCreditCheckInResult, AttendanceCreditSummary} from '../types';

/**
 * 출근권(AttendanceCredit) 서비스 — `AttendanceCreditController` 2개 엔드포인트 정합
 * (recruitment-monetization-gamification-plan.md §2, §5). 사장 전용(`@MasterOnly`) 재화라
 * `/me` 스코프만 있고 매장 경로 파라미터가 없다 — `recruitmentService.ts`의
 * `getMyJobSeeking`/`getMyJobOffers` 와 동일하게 쿼리 파라미터가 없어 이중래핑 함정 자체를
 * 회피하지만, 방어적 파싱(일부 응답이 `{data: T}` 로 래핑될 가능성)은 동일 패턴을 따른다.
 */

// [API Mapping] GET /api/attendance-credits/me — 잔액/소멸예정/연속출석/이번 주 그리드 조회
const getMySummary = async (): Promise<AttendanceCreditSummary> => {
    const res = await api.get<AttendanceCreditSummary>('/api/attendance-credits/me');
    const data: any = res.data as any;
    if (typeof data?.balance === 'number' && Array.isArray(data?.weeklyGrid)) {
        return data as AttendanceCreditSummary;
    }
    if (typeof data?.data?.balance === 'number' && Array.isArray(data?.data?.weeklyGrid)) {
        return data.data as AttendanceCreditSummary;
    }
    throw new Error('Invalid attendance credit summary response');
};

// [API Mapping] POST /api/attendance-credits/check-in — 오늘 출석체크(하루 1회, 중복 시 409)
const checkIn = async (): Promise<AttendanceCreditCheckInResult> => {
    const res = await api.post<AttendanceCreditCheckInResult>('/api/attendance-credits/check-in');
    const data: any = res.data as any;
    if (typeof data?.balance === 'number') {
        return data as AttendanceCreditCheckInResult;
    }
    if (typeof data?.data?.balance === 'number') {
        return data.data as AttendanceCreditCheckInResult;
    }
    throw new Error('Invalid attendance credit check-in response');
};

const attendanceCreditService = {
    getMySummary,
    checkIn,
};

export default attendanceCreditService;
export {getMySummary, checkIn};
