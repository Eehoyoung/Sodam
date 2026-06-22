import api from '../../../common/utils/api';

/** 상시근로자 월별 추이(A3·고용세액공제 신호). BE: GET /api/stores/{storeId}/tax/headcount-trend */
export interface MonthCount {
  month: number;
  headcount: number;
}

export interface HeadcountTrend {
  storeId: number;
  year: number;
  monthly: MonthCount[];
  averageHeadcount: number;
  priorYearAverage: number;
  increasedVsPriorYear: boolean;
  disclaimer: string;
}

export async function fetchHeadcountTrend(storeId: number, year: number): Promise<HeadcountTrend> {
  const {data} = await api.get<HeadcountTrend>(
    `/api/stores/${storeId}/tax/headcount-trend`,
    {params: {year}},
  );
  return data;
}
