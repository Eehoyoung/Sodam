import api from '../../../common/api/client';

/**
 * 내 소담 근무 이력 서비스 (WP-H·K.2).
 *
 * BE 계약:
 *   GET /api/me/history/attendance?page&size → 본인 출퇴근(전 매장, 최신순)
 *   GET /api/me/history/contracts           → 본인 근로계약(전 매장)
 *   GET /api/me/history/attendance.csv      → 내려받기용 CSV
 *
 * <p>매장 스코프가 아니라 <b>본인 스코프</b>다 — 요청에 storeId 가 없고 서버가 JWT 주체로만
 * 조회하므로, 퇴사한 매장의 기록도 그대로 보이고 타인 데이터에는 구조적으로 닿을 수 없다.</p>
 *
 * <p>이 화면이 필요한 이유: 보존기간 만료 사전 고지 메일이 "마이페이지 &gt; 내 근무 기록에서
 * 내려받으세요"라고 안내한다. 파기된 기록은 되돌릴 수 없으므로 근로자가 직접 보관할 수 있어야 한다.</p>
 *
 * ⚠️ {@code api.get} 은 (url, params, config) 시그니처 — params 를 {'{'}params:{'{'}...{'}'}{'}'} 로
 * 이중 래핑하면 쿼리가 전송되지 않는다(api-get-param-double-wrap).
 */

export interface MyAttendanceItem {
    id: number;
    storeName: string;
    workDate: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    workingMinutes: number;
    appliedHourlyWage: number | null;
}

export interface MyContractItem {
    id: number;
    storeId: number;
    startDate: string | null;
    endDate: string | null;
    payType: string | null;
    hourlyWage: number | null;
    monthlyBaseSalary: number | null;
    createdAt: string | null;
}

export interface MyHistoryPage<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    hasNext: boolean;
}

// [API Mapping] GET /api/me/history/attendance — 본인 스코프(전 매장, 퇴사 매장 포함)
const fetchMyAttendance = async (page = 0, size = 30): Promise<MyHistoryPage<MyAttendanceItem>> => {
    const res = await api.get<MyHistoryPage<MyAttendanceItem>>('/api/me/history/attendance', {page, size});
    return res.data;
};

// [API Mapping] GET /api/me/history/contracts
const fetchMyContracts = async (): Promise<MyContractItem[]> => {
    const res = await api.get<MyContractItem[]>('/api/me/history/contracts');
    return res.data;
};

/**
 * 근무 기록 CSV 원문을 받아온다.
 *
 * 이 프로젝트에는 네이티브 파일 저장 라이브러리가 없어, 증명서·급여명세서와 동일하게
 * 바이트를 받은 뒤 후처리(공유)는 호출 화면이 Share 로 처리한다.
 */
const fetchMyAttendanceCsv = async (): Promise<string> => {
    const res = await api.get<string>('/api/me/history/attendance.csv', undefined, {responseType: 'text'});
    return res.data;
};

const myHistoryService = {
    fetchMyAttendance,
    fetchMyContracts,
    fetchMyAttendanceCsv,
};

export default myHistoryService;
