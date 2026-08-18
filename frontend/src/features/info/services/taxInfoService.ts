/**
 * 세무 정보 서비스 — 공용 팩토리(createInfoService) 위에 고정값만 얹는다(P3-8).
 */
import {TaxInfo} from '../types';
import {createInfoService, mapInfoDto} from './createInfoService';

const base = createInfoService<TaxInfo>({
    basePath: '/api/tax-info',
    label: '세무 정보',
    map: dto => ({
        ...mapInfoDto(dto, 'TAX', '소담 세무팀'),
        taxYear: undefined,
        applicableGroups: [],
    }),
});

const taxInfoService = {
    getCategories: base.getCategories,
    getTaxInfosByCategory: base.getByCategory,
    getTaxInfoById: base.getById,
};

export default taxInfoService;
