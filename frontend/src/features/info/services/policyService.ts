/**
 * 정책 정보 서비스 — 공용 팩토리(createInfoService) 위에 고정값만 얹는다(P3-8).
 */
import {PolicyInfo} from '../types';
import {createInfoService, mapInfoDto} from './createInfoService';

const base = createInfoService<PolicyInfo>({
    basePath: '/api/policy-info',
    label: '정책 정보',
    map: dto => ({
        ...mapInfoDto(dto, 'POLICY', '소담 정책팀'),
        policyNumber: undefined,
        eligibilityCriteria: [],
        applicationDeadline: undefined,
    }),
});

const policyService = {
    getCategories: base.getCategories,
    getPoliciesByCategory: base.getByCategory,
    getPolicyById: base.getById,
};

export default policyService;
