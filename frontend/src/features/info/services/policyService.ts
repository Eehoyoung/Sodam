/**
 * 정책 정보 관련 서비스
 * 정부 지원 정책 정보 조회 및 관리 기능을 제공합니다.
 */

import api from '../../../common/utils/api';
import {PolicyInfo, InfoCategory} from '../types';

// 공통 DTO -> UI 타입 매퍼
const mapToPolicyInfo = (dto: any): PolicyInfo => ({
    id: String(dto.id),
    categoryId: 'POLICY',
    title: dto.title ?? '',
    summary: dto.content ? String(dto.content).slice(0, 100) : '',
    content: dto.content ?? '',
    publishDate: dto.createdAt ?? new Date().toISOString(),
    author: '소담 정책팀',
    tags: [],
    imageUrl: dto.imagePath || undefined,
    policyNumber: undefined,
    eligibilityCriteria: [],
    applicationDeadline: undefined,
});

// 정책 정보 서비스 객체
const policyService = {
    /** 카테고리(임시) */
    getCategories: async (): Promise<InfoCategory[]> => {
        return [ { id: 'ALL', name: '전체', description: '전체 보기' } ];
    },

    /** 카테고리별(임시) 목록 */
    getPoliciesByCategory: async (_categoryId: string): Promise<PolicyInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/policy-info`);
            return (res.data || []).map(mapToPolicyInfo);
        } catch (error) {
            console.error('카테고리별 정책 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 상세 */
    getPolicyById: async (policyId: string): Promise<PolicyInfo> => {
        try {
            // api.json에 상세 경로 명시가 없을 수 있어 임의로 정의
            const res = await api.get<any>(`/api/policy-info/${policyId}`);
            return mapToPolicyInfo(res.data);
        } catch (error) {
            console.error('정책 정보 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 검색 (임의 경로) */
    searchPolicy: async (searchTerm: string): Promise<PolicyInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/policy-info/search/title`, { keyword: searchTerm });
            return (res.data || []).map(mapToPolicyInfo);
        } catch (error) {
            console.error('정책 정보 검색 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 최근/마감임박/지역 (임의 경로) */
    getRecentPolicies: async (limit: number = 5): Promise<PolicyInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/policy-info/recent`, { limit });
            return (res.data || []).map(mapToPolicyInfo);
        } catch (error) {
            console.error('최근 정책 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
    getDeadlinePolicies: async (limit: number = 5): Promise<PolicyInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/policy-info/deadline`, { limit });
            return (res.data || []).map(mapToPolicyInfo);
        } catch (error) {
            console.error('마감 임박 정책 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
    getPoliciesByRegion: async (region: string): Promise<PolicyInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/policy-info/region`, { region });
            return (res.data || []).map(mapToPolicyInfo);
        } catch (error) {
            console.error('지역별 정책 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default policyService;
