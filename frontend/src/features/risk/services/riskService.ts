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

// ─── 260815 WP-1 / 260816 WP-A: 상시근로자(근기법) 참고 산정 + 전환 시뮬레이션 ──────────

export interface StatutoryHeadcountRoadmapItem {
    stage: number;
    expectedYear: number;
    title: string;
    description: string;
}

export interface StatutoryHeadcountResponse {
    storeId: number;
    periodStart: string;
    periodEnd: string;
    operatingDays: number;
    manDays: number;
    statutoryHeadcount: number;
    meetsThreshold: boolean;
    roadmap: StatutoryHeadcountRoadmapItem[];
    disclaimer: string;
}

export interface HeadcountSimulationResponse {
    storeId: number;
    currentStatutoryHeadcount: number;
    additionalEmployees: number;
    projectedStatutoryHeadcount: number;
    crossesThreshold: boolean;
    newlyApplicableProvisions: string[];
    estimatedMonthlyCostMin: number;
    estimatedMonthlyCostMax: number;
    disclaimer: string;
}

/** 상시근로자(근기법 §7의2) 참고 산정 + 정부 확대적용 로드맵. */
export async function fetchStatutoryHeadcount(storeId: number): Promise<StatutoryHeadcountResponse> {
    const {data} = await api.get<StatutoryHeadcountResponse>(
        `/api/stores/${storeId}/labor-risk/statutory-headcount`,
    );
    return data;
}

/** 직원을 additionalEmployees명 더 채용했을 때 5인 경계를 넘는지 전환 시뮬레이션. */
export async function simulateStatutoryHeadcount(
    storeId: number,
    additionalEmployees: number = 1,
): Promise<HeadcountSimulationResponse> {
    const {data} = await api.get<HeadcountSimulationResponse>(
        `/api/stores/${storeId}/labor-risk/statutory-headcount/simulate`,
        {additionalEmployees},
    );
    return data;
}

// ─── 260816 WP-B: 노무 건강도 상세 분석(플랜 게이팅 — LABOR_LAW_BASIC/FULL) ──────────

export interface LaborHealthSummaryItem {
    type: LaborRiskType;
    severity: LaborRiskSeverity;
    /** 매장 단위 항목(HEADCOUNT_THRESHOLD)은 null. */
    employeeId: number | null;
    employeeName: string | null;
    /** BASIC 플랜 응답에서는 null — FULL(PRO 이상)에서만 채워진다. */
    message: string | null;
}

export interface LaborHealthResponse {
    storeId: number;
    score: number;
    dangerCount: number;
    warnCount: number;
    needsAttentionCount: number;
    items: LaborHealthSummaryItem[];
    disclaimer: string;
}

/** 노무 건강도 요약(건수·유형만) — LABOR_LAW_BASIC(STARTER 이상) 필요. 미충족 시 402. */
export async function fetchLaborHealth(storeId: number): Promise<LaborHealthResponse> {
    const {data} = await api.get<LaborHealthResponse>(`/api/stores/${storeId}/labor-health`);
    return data;
}

/** 노무 건강도 상세(설명·해소 가이드 포함) — LABOR_LAW_FULL(PRO 이상) 필요. 미충족 시 402. */
export async function fetchLaborHealthDetail(storeId: number): Promise<LaborHealthResponse> {
    const {data} = await api.get<LaborHealthResponse>(`/api/stores/${storeId}/labor-health/detail`);
    return data;
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
