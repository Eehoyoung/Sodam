import {api, unwrapData} from '../../../common/api';
import {Event, LaborInfo, Policy, TaxInfo, Tip} from '../types';

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

// 제거된 것 (RELEASE_GATES T-6, 2026-08-10):
//   fetchTestimonials / getServices — 항상 throw 하는 플레이스홀더였고 프로덕션 호출부가 0건이었다.
//   fetchHomeData — 위 두 함수를 Promise.all 에 넣어 "항상 전체 실패"하는 집계였고, 역시 호출부 0건.
//   components/Testimonials.tsx — 어떤 화면에도 붙지 않은 고아 컴포넌트. 실명처럼 보이는 가짜 후기를
//     하드코딩하고 있어, 노출됐다면 표시광고법 §3(거짓·과장) 소지가 있었다.
// "BE 엔드포인트 미구현"으로 등재돼 있었으나 소비처가 없었다 — 만들 API 가 아니라 지울 코드였다.
// 후기·서비스 소개를 다시 하기로 하면 그때 실제 소비처와 함께 설계할 것.

export default {
    fetchEvents,
    fetchLaborInfo,
    fetchPolicies,
    fetchTaxInfo,
    fetchTips,
};
