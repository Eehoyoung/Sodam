import api from '../../../common/utils/api';

/**
 * 노무 리스크 + 채용 비용 시뮬레이션 (계약 기반 — FE 선행 구현).
 * BE: GET /api/stores/{storeId}/labor-risk · GET /api/labor/hiring-cost
 */
export type LaborRiskType =
    | 'WEEKLY_15H_BOUNDARY'
    | 'WEEKLY_52H_NEAR'
    | 'CONTRACT_UNSIGNED'
    | 'MIN_WAGE_RISK'
    | 'SEVERANCE_UPCOMING'
    | 'CONTRACT_OVER_52H';

export type LaborRiskSeverity = 'WARN' | 'DANGER';

export interface LaborRiskItem {
    type: LaborRiskType;
    severity: LaborRiskSeverity;
    employeeId: number;
    employeeName: string;
    message: string;
    value?: string;
}

/** 매장 노무 리스크 목록. */
export async function fetchLaborRisks(storeId: number): Promise<LaborRiskItem[]> {
    const {data} = await api.get<{items: LaborRiskItem[]}>(`/api/stores/${storeId}/labor-risk`);
    return data?.items ?? [];
}

// ─── 채용 비용 시뮬레이션 ───────────────────────────────────────────
export interface EmployerInsurance {
    nationalPension: number;
    healthInsurance: number;
    employmentInsurance: number;
    industrialAccident: number;
    total: number;
}

export interface HiringCostEstimate {
    monthlyBaseWage: number;
    weeklyAllowance: number;
    monthlyGrossWage: number;
    weeklyAllowanceEligible: boolean;
    employerInsurance: EmployerInsurance;
    monthlySeveranceAccrual: number;
    monthlyTotalCost: number;
}

/** 시급·주당 근무시간 기준 월 고용비용 추정. */
export async function fetchHiringCost(
    hourlyWage: number,
    weeklyHours: number,
): Promise<HiringCostEstimate> {
    const {data} = await api.get<HiringCostEstimate>('/api/labor/hiring-cost', {
        hourlyWage,
        weeklyHours,
    });
    return data;
}
