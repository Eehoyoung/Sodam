/**
 * 팁 정보 관련 서비스
 * 유용한 팁과 가이드 정보 조회 및 관리 기능을 제공합니다.
 */

import api from '../../../common/utils/api';
import {TipsInfo, InfoCategory} from '../types';

// 공통 DTO -> UI 타입 매퍼
const mapToTipInfo = (dto: any): TipsInfo => ({
    id: String(dto.id),
    categoryId: 'TIPS',
    title: dto.title ?? '',
    summary: dto.content ? String(dto.content).slice(0, 100) : '',
    content: dto.content ?? '',
    publishDate: dto.createdAt ?? new Date().toISOString(),
    author: '소담 정보팀',
    tags: [],
    imageUrl: dto.imagePath || undefined,
    difficulty: 'BEGINNER',
    estimatedTime: undefined,
});

// 팁 정보 서비스 객체
const tipsService = {
    /** 카테고리(임시) */
    getCategories: async (): Promise<InfoCategory[]> => {
        return [ { id: 'ALL', name: '전체', description: '전체 보기' } ];
    },

    /** 카테고리별(임시) 목록 */
    getTipsByCategory: async (_categoryId: string): Promise<TipsInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tip-info`);
            return (res.data || []).map(mapToTipInfo);
        } catch (error) {
            console.error('카테고리별 팁 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 상세 */
    getTipById: async (tipId: string): Promise<TipsInfo> => {
        try {
            const res = await api.get<any>(`/api/tip-info/${tipId}`);
            return mapToTipInfo(res.data);
        } catch (error) {
            console.error('팁 정보 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 검색 (api.json에 title/content 검색 존재) */
    searchTips: async (searchTerm: string): Promise<TipsInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tip-info/search/title`, { keyword: searchTerm });
            return (res.data || []).map(mapToTipInfo);
        } catch (error) {
            console.error('팁 정보 검색 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 최근 (api.json 존재) */
    getRecentTips: async (limit: number = 5): Promise<TipsInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tip-info/recent`, { limit });
            return (res.data || []).map(mapToTipInfo);
        } catch (error) {
            console.error('최근 팁 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /** 인기/난이도 (임의 경로) */
    getPopularTips: async (limit: number = 5): Promise<TipsInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tip-info/popular`, { limit });
            return (res.data || []).map(mapToTipInfo);
        } catch (error) {
            console.error('인기 팁 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
    getTipsByDifficulty: async (difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): Promise<TipsInfo[]> => {
        try {
            const res = await api.get<any[]>(`/api/tip-info/difficulty`, { difficulty });
            return (res.data || []).map(mapToTipInfo);
        } catch (error) {
            console.error('난이도별 팁 정보를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default tipsService;
