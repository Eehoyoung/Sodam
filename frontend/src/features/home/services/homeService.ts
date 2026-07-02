import axios from 'axios';
import {Event, LaborInfo, Policy, Service, TaxInfo, Testimonial, Tip} from '../types';
import {env} from '../../../common/config/env';

/**
 * 홈 화면에 필요한 데이터를 가져오는 서비스
 */
const API_URL = env.apiBaseUrl;

/**
 * 이벤트 슬라이더에 표시할 이벤트 목록을 가져옵니다.
 * @returns 이벤트 목록
 */
export const fetchEvents = async (): Promise<Event[]> => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/events`);
        return response.data.data;
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
        const response = await axios.get(`${API_URL}/api/v1/labor-info`);
        return response.data.data;
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
        const response = await axios.get(`${API_URL}/api/v1/policies`);
        return response.data.data;
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
        const response = await axios.get(`${API_URL}/api/v1/tax-info`);
        return response.data.data;
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
        const response = await axios.get(`${API_URL}/api/v1/tips`);
        return response.data.data;
    } catch (error) {
        console.error('[홈 서비스] 팁 정보 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 사용자 후기 목록을 가져옵니다.
 * @returns 사용자 후기 목록
 */
export const fetchTestimonials = async (): Promise<Testimonial[]> => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/testimonials`);
        return response.data.data;
    } catch (error) {
        console.error('[홈 서비스] 사용자 후기 가져오기 실패:', error);
        throw error;
    }
};

/**
 * 서비스 목록을 가져옵니다.
 * @returns 서비스 목록
 */
export const getServices = async (): Promise<Service[]> => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/services`);
        return response.data.data;
    } catch (error) {
        console.error('[홈 서비스] 서비스 정보 가져오기 실패:', error);
        throw error;
    }
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
