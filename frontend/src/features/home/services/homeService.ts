import {api, unwrapData} from '../../../common/api';
import {Event, LaborInfo, Policy, Service, TaxInfo, Testimonial, Tip} from '../types';

/**
 * 홈 화면에 필요한 데이터를 가져오는 서비스 (WP-03).
 *
 * 과거에는 raw axios로 `${env.apiBaseUrl}/api/v1/*`를 호출했다 — BE에 그 경로가 전혀 없어
 * 이 파일의 모든 fetch*는 언제나 실패했다(WP-00 계약 기준선 characterization으로 확인,
 * `frontend/__tests__/contracts/apiEndpointContract.test.ts`). 이제 공용 `common/api` client와
 * 실제 BE 경로(`/api/campaigns/active`, `/api/labor-info`, `/api/policy-info`, `/api/tax-info`,
 * `/api/tip-info`)를 쓴다.
 *
 * ⚠️ 이 파일과 이를 참조하는 5개 컴포넌트(LaborInfoBoard/TaxInfoBoard/TipsBoard/PolicyBoard/
 * Testimonials)는 어떤 화면에서도 렌더링되지 않는 고아(orphan) 코드다 — `HomeScreen.tsx`는
 * 이 컴포넌트들을 import하지 않는다(2026-07-19 WP-03 조사로 확인). 그래서 이번 수정은 실제
 * 사용자 화면에는 아무 영향이 없다 — 에뮬레이터 확인 대상이 아니다(에뮬레이터 테스트 가이드 참고).
 * UI 재연결은 이 계획 범위 밖의 별도 제품 결정이다.
 */

interface BeContentInfo {
    id: number;
    title: string;
    content: string;
    imagePath?: string;
    createdAt?: string;
}

interface BeCampaign {
    key: string;
    title: string;
    message: string;
    deepLink?: string;
}

const toEvent = (raw: BeCampaign): Event => ({
    id: raw.key,
    title: raw.title,
    description: raw.message,
    date: '',
    url: raw.deepLink,
});

const toContentInfo = (raw: BeContentInfo): LaborInfo | Policy | TaxInfo | Tip => ({
    id: String(raw.id),
    title: raw.title,
    description: raw.content,
    content: raw.content,
    date: raw.createdAt ?? '',
    category: '',
    imageUrl: raw.imagePath,
});

/**
 * 이벤트 슬라이더에 표시할 이벤트 목록을 가져옵니다.
 * @returns 이벤트 목록
 */
export const fetchEvents = async (): Promise<Event[]> => {
    try {
        const response = await api.get<BeCampaign[]>('/api/campaigns/active');
        return unwrapData(response.data).map(toEvent);
    } catch (error) {
        console.error('[홈 서비스] 이벤트 데이터 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 노동법 정보 목록을 가져옵니다.
 * @returns 노동법 정보 목록
 */
export const fetchLaborInfo = async (): Promise<LaborInfo[]> => {
    try {
        const response = await api.get<BeContentInfo[]>('/api/labor-info');
        return unwrapData(response.data).map(toContentInfo);
    } catch (error) {
        console.error('[홈 서비스] 노동법 정보 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 정책 정보 목록을 가져옵니다.
 * @returns 정책 정보 목록
 */
export const fetchPolicies = async (): Promise<Policy[]> => {
    try {
        const response = await api.get<BeContentInfo[]>('/api/policy-info');
        return unwrapData(response.data).map(toContentInfo);
    } catch (error) {
        console.error('[홈 서비스] 정책 정보 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 세금 정보 목록을 가져옵니다.
 * @returns 세금 정보 목록
 */
export const fetchTaxInfo = async (): Promise<TaxInfo[]> => {
    try {
        const response = await api.get<BeContentInfo[]>('/api/tax-info');
        return unwrapData(response.data).map(toContentInfo);
    } catch (error) {
        console.error('[홈 서비스] 세금 정보 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 팁 목록을 가져옵니다.
 * @returns 팁 목록
 */
export const fetchTips = async (): Promise<Tip[]> => {
    try {
        const response = await api.get<BeContentInfo[]>('/api/tip-info');
        return unwrapData(response.data).map(toContentInfo);
    } catch (error) {
        console.error('[홈 서비스] 팁 정보 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 사용자 후기 목록을 가져옵니다.
 *
 * G-1 기본 처분(작업계획서 §13) — BE에 대응 리소스가 없다. 신규 API를 만들지 않고 항상
 * 실패시켜(과거 `/api/v1/testimonials` raw axios 호출이 항상 404였던 것과 동일하게) 호출부의
 * 기존 실패 처리 분기를 그대로 태운다. 제품 판단(정적 데이터 채택/BE 신규 구현/완전 제거)이
 * 내려지면 이 함수를 실제 구현으로 교체한다.
 * @returns 사용자 후기 목록
 */
export const fetchTestimonials = async (): Promise<Testimonial[]> => {
    console.error('[홈 서비스] 사용자 후기 가져오기 실패: BE 엔드포인트 미구현(G-1)');
    throw new Error('TESTIMONIALS_NOT_IMPLEMENTED');
};

/**
 * 서비스 목록을 가져옵니다.
 *
 * G-1 기본 처분 — fetchTestimonials와 동일한 사유·처분.
 * @returns 서비스 목록
 */
export const getServices = async (): Promise<Service[]> => {
    console.error('[홈 서비스] 서비스 정보 가져오기 실패: BE 엔드포인트 미구현(G-1)');
    throw new Error('SERVICES_NOT_IMPLEMENTED');
};

/**
 * 홈 화면에 필요한 모든 데이터를 한 번에 가져옵니다.
 * @returns 홈 화면 데이터 객체
 */
export const fetchHomeData = async () => {
    try {
        const [events, laborInfo, policies, taxInfo, tips, testimonials] = await Promise.all([
            fetchEvents(),
            fetchLaborInfo(),
            fetchPolicies(),
            fetchTaxInfo(),
            fetchTips(),
            fetchTestimonials(),
        ]);

        return {
            events,
            laborInfo,
            policies,
            taxInfo,
            tips,
            testimonials,
        };
    } catch (error) {
        console.error('[홈 서비스] 홈 데이터 가져오기 실패:', error);
        throw error;
    }
};

export default {
    fetchEvents,
    fetchLaborInfo,
    fetchPolicies,
    fetchTaxInfo,
    fetchTips,
    fetchTestimonials,
    fetchHomeData,
    getServices,
};
