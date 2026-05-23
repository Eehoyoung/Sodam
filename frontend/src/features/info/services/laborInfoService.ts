/**
 * 노동법 정보 관련 서비스
 * 노동법 정보 조회 및 관리 기능을 제공합니다.
 */

import api from '../../../common/utils/api';
import {LaborInfo, InfoCategory, InfoArticle} from '../types';

// 공통 DTO -> UI 타입 매퍼
const mapToLaborInfo = (dto: any): LaborInfo => ({
    id: String(dto.id),
    categoryId: 'LABOR',
    title: dto.title ?? '',
    summary: dto.content ? String(dto.content).slice(0, 100) : '',
    content: dto.content ?? '',
    publishDate: dto.createdAt ?? new Date().toISOString(),
    author: '소담 노무팀',
    tags: [],
    imageUrl: dto.imagePath || undefined,
    lawReference: undefined,
    effectiveDate: undefined,
});

// 노동법 정보 서비스 객체
const laborInfoService = {
    /**
     * 모든 노동법 정보 카테고리 조회 (백엔드 미정: 임시 카테고리 제공)
     */
    getCategories: async (): Promise<InfoCategory[]> => {
        return [
            { id: 'ALL', name: '전체', description: '전체 보기' },
        ];
    },

    /**
     * 카테고리별(임시) 노동법 정보 목록 조회
     */
    getLaborInfosByCategory: async (categoryId: string): Promise<LaborInfo[]> => {
        try {
            // 백엔드 카테고리 미정: ALL 또는 기타 모두 전체 목록으로 대체
            const res = await api.get<any[]>(`/api/labor-info`);
            return (res.data || []).map(mapToLaborInfo);
        } catch (error) {
            console.error('카테고리별 노동법 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 특정 노동법 정보 상세 조회
     */
    getLaborInfoById: async (infoId: string): Promise<LaborInfo> => {
        try {
            const res = await api.get<any>(`/api/labor-info/${infoId}`);
            return mapToLaborInfo(res.data);
        } catch (error) {
            console.error('노동법 정보 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 노동법 정보 검색 (백엔드 스펙 부재 시 임의 경로 사용)
     */
    searchLaborInfo: async (searchTerm: string): Promise<LaborInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/labor-info/search/title`, { keyword: searchTerm });
            return (res.data || []).map(mapToLaborInfo);
        } catch (error) {
            console.error('노동법 정보 검색 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 최근/인기 (백엔드 스펙 부재 가능: 임의 경로) */
    getRecentLaborInfo: async (limit: number = 5): Promise<LaborInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/labor-info/recent`, { limit });
            return (res.data || []).map(mapToLaborInfo);
        } catch (error) {
            console.error('최근 노동법 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
    getPopularLaborInfo: async (limit: number = 5): Promise<LaborInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/labor-info/popular`, { limit });
            return (res.data || []).map(mapToLaborInfo);
        } catch (error) {
            console.error('인기 노동법 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default laborInfoService;
