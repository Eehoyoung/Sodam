import {Workplace} from '../types';
import {api} from '../../../common/utils/api';

/**
 * 매장 관리 서비스
 * 실제 백엔드 API와 연동하여 매장 정보를 관리합니다.
 */

// Mock data for fallback (API 실패 시 사용)
const mockWorkplaces: Workplace[] = [
    {
        id: '1',
        name: '카페 소담',
        address: '서울시 강남구 역삼동 123-45',
    },
    {
        id: '2',
        name: '레스토랑 소담',
        address: '서울시 서초구 서초동 456-78',
    },
    {
        id: '3',
        name: '베이커리 소담',
        address: '서울시 마포구 합정동 789-10',
    },
];

/**
 * 사업주의 모든 매장 목록 조회
 * @param userId 사업주 사용자 ID
 * @returns 매장 목록
 */
export const getWorkplaces = async (userId?: string): Promise<Workplace[]> => {
    try {
        console.log('[DEBUG_LOG] 매장 목록 조회 API 호출 시작');

        // 실제 API 호출
        const response = await api.get<Workplace[]>(`/api/stores/master/${userId ?? 'current'}`);

        console.log('[DEBUG_LOG] 매장 목록 조회 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 목록 조회 실패:', error);

        // API 실패 시 Mock 데이터 반환 (개발 환경에서만)
        if (__DEV__) {
            console.warn('[DEBUG_LOG] 개발 환경에서 Mock 데이터 사용');
            return mockWorkplaces;
        }

        throw new Error('매장 목록을 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
    }
};

/**
 * 특정 매장 정보 조회
 * @param id 매장 ID
 * @returns 매장 정보
 */
export const getWorkplaceById = async (id: string): Promise<Workplace | undefined> => {
    try {
        console.log('[DEBUG_LOG] 매장 상세 정보 조회 API 호출 시작:', id);

        // 실제 API 호출
        const response = await api.get<Workplace>(`/api/stores/${id}`);

        console.log('[DEBUG_LOG] 매장 상세 정보 조회 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 상세 정보 조회 실패:', error);

        // API 실패 시 Mock 데이터에서 검색 (개발 환경에서만)
        if (__DEV__) {
            console.warn('[DEBUG_LOG] 개발 환경에서 Mock 데이터 사용');
            const workplace = mockWorkplaces.find(wp => wp.id === id);
            return workplace;
        }

        throw new Error('매장 정보를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
    }
};

/**
 * 새 매장 등록
 * @param workplace 매장 정보
 * @returns 등록된 매장 정보
 */
export const createWorkplace = async (workplace: Omit<Workplace, 'id'>): Promise<Workplace> => {
    try {
        console.log('[DEBUG_LOG] 매장 등록 API 호출 시작:', workplace);

        const response = await api.post<Workplace>('/api/stores/registration', workplace);

        console.log('[DEBUG_LOG] 매장 등록 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 등록 실패:', error);
        throw new Error('매장 등록에 실패했습니다. 입력 정보를 확인해주세요.');
    }
};

/**
 * 매장 정보 수정
 * @param id 매장 ID
 * @param workplace 수정할 매장 정보
 * @returns 수정된 매장 정보
 */
export const updateWorkplace = async (id: string, workplace: Partial<Workplace>): Promise<Workplace> => {
    try {
        console.log('[DEBUG_LOG] 매장 정보 수정 API 호출 시작:', id, workplace);

        const response = await api.put<Workplace>(`/api/stores/${id}`, workplace);

        console.log('[DEBUG_LOG] 매장 정보 수정 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 정보 수정 실패:', error);
        throw new Error('매장 정보 수정에 실패했습니다. 입력 정보를 확인해주세요.');
    }
};

/**
 * 매장 삭제
 * @param id 매장 ID
 */
export const deleteWorkplace = async (id: string): Promise<void> => {
    try {
        console.log('[DEBUG_LOG] 매장 삭제 API 호출 시작:', id);

        await api.delete(`/api/stores/${id}`);

        console.log('[DEBUG_LOG] 매장 삭제 성공');
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 삭제 실패:', error);
        throw new Error('매장 삭제에 실패했습니다. 다시 시도해주세요.');
    }
};

/**
 * 매장의 직원 목록 조회
 * @param storeId 매장 ID
 * @returns 직원 목록
 */
export const getWorkplaceEmployees = async (storeId: string): Promise<any[]> => {
    try {
        console.log('[DEBUG_LOG] 매장 직원 목록 조회 API 호출 시작:', storeId);

        const response = await api.get<any[]>(`/api/stores/${storeId}/employees`);

        console.log('[DEBUG_LOG] 매장 직원 목록 조회 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG_LOG] 매장 직원 목록 조회 실패:', error);
        throw new Error('직원 목록을 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
    }
};
