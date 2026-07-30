/**
 * 직원 본인의 실시간 휴게 시작/종료 기록 — 순수 기록/증빙용, 급여 계산과 무관.
 * BE `EmployeeBreakRecordController` (`/api/stores/{storeId}/employees/me/breaks`).
 */
import api from '../../../common/api/client';

export interface BreakRecordDto {
    id: number;
    employeeId: number;
    storeId: number;
    workDate: string;
    breakMinutes: number;
    grantedConfirmed: boolean;
    memo?: string | null;
    recordedBy: 'MASTER' | 'EMPLOYEE';
    breakStartTime?: string | null;
    breakEndTime?: string | null;
    createdAt: string;
}

async function start(storeId: number): Promise<BreakRecordDto> {
    const res = await api.post<BreakRecordDto>(`/api/stores/${storeId}/employees/me/breaks/start`);
    return res.data;
}

async function end(storeId: number, breakRecordId: number): Promise<BreakRecordDto> {
    const res = await api.post<BreakRecordDto>(
        `/api/stores/${storeId}/employees/me/breaks/${breakRecordId}/end`,
    );
    return res.data;
}

async function list(storeId: number, from?: string, to?: string): Promise<BreakRecordDto[]> {
    // api.get(url, {params}) 이중 래핑 함정 — 쿼리스트링을 직접 조립한다 (CLAUDE.md 참고).
    const query = from && to ? `?from=${from}&to=${to}` : '';
    const res = await api.get<BreakRecordDto[]>(`/api/stores/${storeId}/employees/me/breaks${query}`);
    return res.data;
}

const breakRecordService = {start, end, list};

export default breakRecordService;
