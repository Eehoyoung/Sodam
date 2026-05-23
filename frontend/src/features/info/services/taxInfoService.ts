/**
 * 세금 정보 관련 서비스
 * 세금 정보 조회 및 관리 기능을 제공합니다.
 */

import api from '../../../common/utils/api';
import {TaxInfo, InfoCategory} from '../types';

// 공통 DTO -> UI 타입 매퍼
const mapToTaxInfo = (dto: any): TaxInfo => ({
    id: String(dto.id),
    categoryId: 'TAX',
    title: dto.title ?? '',
    summary: dto.content ? String(dto.content).slice(0, 100) : '',
    content: dto.content ?? '',
    publishDate: dto.createdAt ?? new Date().toISOString(),
    author: '소담 세무팀',
    tags: [],
    imageUrl: dto.imagePath || undefined,
    taxYear: undefined,
    applicableGroups: [],
});

// 세금 정보 서비스 객체
const taxInfoService = {
    /** 카테고리(임시) */
    getCategories: async (): Promise<InfoCategory[]> => {
        return [ { id: 'ALL', name: '전체', description: '전체 보기' } ];
    },

    /** 카테고리별(임시) 목록 */
    getTaxInfosByCategory: async (_categoryId: string): Promise<TaxInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tax-info`);
            return (res.data || []).map(mapToTaxInfo);
        } catch (error) {
            console.error('카테고리별 세금 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 상세 */
    getTaxInfoById: async (infoId: string): Promise<TaxInfo> => {
        try {
            const res = await api.get<any>(`/api/tax-info/${infoId}`);
            return mapToTaxInfo(res.data);
        } catch (error) {
            console.error('세금 정보 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 검색 (임의 경로) */
    searchTaxInfo: async (searchTerm: string): Promise<TaxInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tax-info/search/title`, { keyword: searchTerm });
            return (res.data || []).map(mapToTaxInfo);
        } catch (error) {
            console.error('세금 정보 검색 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 최근 (임의 경로) */
    getRecentTaxInfo: async (limit: number = 5): Promise<TaxInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tax-info/recent`, { limit });
            return (res.data || []).map(mapToTaxInfo);
        } catch (error) {
            console.error('최근 세금 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 연도/그룹 (임의 경로, 현재 미사용) */
    getTaxInfoByYear: async (year: string): Promise<TaxInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tax-info/year`, { year });
            return (res.data || []).map(mapToTaxInfo);
        } catch (error) {
            console.error('연도별 세금 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
    getTaxInfoByGroup: async (group: string): Promise<TaxInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tax-info/group`, { group });
            return (res.data || []).map(mapToTaxInfo);
        } catch (error) {
            console.error('그룹별 세금 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default taxInfoService;
