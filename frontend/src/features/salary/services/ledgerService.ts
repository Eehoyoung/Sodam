import api from '../../../common/api/client';

/**
 * 법정 장부 자료(B8/L-NEW-03) — 임금대장(§48①)·근로자명부(§41).
 * BE: GET /api/stores/{storeId}/ledger/wage, /ledger/roster
 */

export interface WageLine {
  employeeId: number;
  employeeName: string;
  regularWage: number;
  overtimeWage: number;
  nightWorkWage: number;
  holidayWorkWage: number;
  weeklyAllowance: number;
  grossWage: number;
  deduction: number;
  netWage: number;
}

export interface WageLedger {
  storeId: number;
  year: number;
  month: number;
  employeeCount: number;
  totalGross: number;
  totalDeduction: number;
  totalNet: number;
  items: WageLine[];
  disclaimer: string;
}

export interface RosterLine {
  employeeId: number | null;
  employeeName: string;
  hireDate: string | null;
  hourlyWage: number | null;
  active: boolean;
}

export interface EmployeeRoster {
  storeId: number;
  employeeCount: number;
  items: RosterLine[];
  disclaimer: string;
}

export async function fetchWageLedger(
  storeId: number,
  year: number,
  month: number,
): Promise<WageLedger> {
  const {data} = await api.get<WageLedger>(
    `/api/stores/${storeId}/ledger/wage`,
    {year, month},
  );
  return data;
}

export async function fetchEmployeeRoster(storeId: number): Promise<EmployeeRoster> {
  const {data} = await api.get<EmployeeRoster>(
    `/api/stores/${storeId}/ledger/roster`,
  );
  return data;
}
