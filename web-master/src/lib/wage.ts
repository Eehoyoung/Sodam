import { apiFetch } from "./api";

export interface EmployeeWageUpdate {
  employeeId: number;
  storeId: number;
  customHourlyWage?: number;
  useStoreStandardWage?: boolean;
}

/**
 * 직원 시급 변경 — POST /api/wages/employee.
 * 전자서명 기반 변경안(DRAFT→SIGNING→VERIFIED→APPLIED) 워크플로우는 이번 범위에 포함하지 않는다
 * (EmploymentAmendmentController — 별도 스코프로 이연, docs/260726/08_개발로드맵.md Phase2 참고).
 * 이 함수는 기존 WageController 의 직접 업데이트 경로를 그대로 쓴다.
 */
export function updateEmployeeWage(update: EmployeeWageUpdate): Promise<void> {
  return apiFetch<void>("/api/wages/employee", {
    method: "POST",
    body: JSON.stringify(update),
  });
}

/** 직원의 매장별 현재 시급 조회 — GET /api/wages/employee/{employeeId}/store/{storeId}. */
export function fetchEmployeeWage(employeeId: number, storeId: number): Promise<number> {
  return apiFetch<number>(`/api/wages/employee/${employeeId}/store/${storeId}`);
}
