/**
 * 노무 정보 서비스 — 공용 팩토리(createInfoService) 위에 고정값만 얹는다(P3-8).
 */
import {LaborInfo} from '../types';
import {createInfoService, mapInfoDto} from './createInfoService';

const base = createInfoService<LaborInfo>({
    basePath: '/api/labor-info',
    label: '노무 정보',
    map: dto => ({
        ...mapInfoDto(dto, 'LABOR', '소담 노무팀'),
        lawReference: undefined,
        effectiveDate: undefined,
    }),
});

const laborInfoService = {
    getCategories: base.getCategories,
    getLaborInfosByCategory: base.getByCategory,
    getLaborInfoById: base.getById,
};

export default laborInfoService;
