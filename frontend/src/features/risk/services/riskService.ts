import api from '../../../common/api/client';

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
    | 'CONTRACT_OVER_52H'
    // 260815 WP-1: 상시근로자(근기법) 참고 산정 — 매장 단위 항목(employeeId 없음).
    | 'HEADCOUNT_THRESHOLD'
    // 260815 WP-2: 사후 감지 → 사전 예측(확정 시프트 기반, 실근무 불요).
    | 'SCHEDULE_52H_FORECAST'
    | 'SCHEDULE_15H_SHORTFALL'
    | 'BREAK_MISSING_FORECAST'
    | 'MINOR_NIGHT_FORECAST'
    | 'MINOR_HOURS_FORECAST';

export type LaborRiskSeverity = 'WARN' | 'DANGER';

export interface LaborRiskItem {
    type: LaborRiskType;
    severity: LaborRiskSeverity;
    /** HEADCOUNT_THRESHOLD처럼 매장 단위 항목은 null(특정 직원 귀속 아님). */
    employeeId: number | null;
    employeeName: string | null;
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
