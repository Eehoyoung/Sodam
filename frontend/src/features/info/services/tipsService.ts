/**
 * 팁 정보 서비스 — 공용 팩토리(createInfoService) 위에 고정값만 얹는다(P3-8).
 */
import {TipsInfo} from '../types';
import {createInfoService, mapInfoDto} from './createInfoService';

const base = createInfoService<TipsInfo>({
    basePath: '/api/tip-info',
    label: '팁 정보',
    map: dto => ({
        ...mapInfoDto(dto, 'TIPS', '소담 정보팀'),
        difficulty: 'BEGINNER' as const,
        estimatedTime: undefined,
    }),
});

const tipsService = {
    getCategories: base.getCategories,
    getTipsByCategory: base.getByCategory,
    getTipById: base.getById,
};

export default tipsService;
