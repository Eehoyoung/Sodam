import api from '../../../common/utils/api';

/** 세무 시뮬레이터(T-NEW-05). BE: GET /api/tax/simulate?income=&expenses= */
export interface TaxSimulation {
  income: number;
  expenses: number;
  taxableIncome: number;
  estimatedTax: number;
  effectiveRate: number;
  disclaimer: string;
}

export async function fetchTaxSimulation(income: number, expenses: number): Promise<TaxSimulation> {
  const {data} = await api.get<TaxSimulation>('/api/tax/simulate', {income, expenses});
  return data;
}
