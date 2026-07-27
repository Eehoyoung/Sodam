import { apiFetch, ApiError } from "./api";

export type JobWorkType = "SUBSTITUTE" | "REGULAR";
export type JobCategory =
  | "CAFE"
  | "BAKERY"
  | "RESTAURANT_HALL"
  | "KITCHEN"
  | "FAST_FOOD"
  | "FAMILY_RESTAURANT"
  | "CONVENIENCE_STORE"
  | "MART_SALES"
  | "PUB_BAR"
  | "DELIVERY_DRIVING"
  | "OFFICE_SIDE_JOB"
  | "ETC";

export const JOB_CATEGORY_LABEL: Record<JobCategory, string> = {
  CAFE: "카페",
  BAKERY: "베이커리",
  RESTAURANT_HALL: "음식점 홀/서빙",
  KITCHEN: "주방/조리",
  FAST_FOOD: "패스트푸드",
  FAMILY_RESTAURANT: "패밀리레스토랑",
  CONVENIENCE_STORE: "편의점",
  MART_SALES: "마트/판매",
  PUB_BAR: "술집/바",
  DELIVERY_DRIVING: "배달/운전",
  OFFICE_SIDE_JOB: "사무/부업",
  ETC: "기타",
};

export interface JobPosting {
  id: number;
  storeId: number;
  storeName: string;
  workType: JobWorkType;
  jobCategory: JobCategory;
  workDate: string | null;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  message: string | null;
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostingUpsertInput {
  workType: JobWorkType;
  jobCategory: JobCategory;
  workDate: string | null;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  message?: string;
  open: boolean;
}

export type JobResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface JobApplicant {
  applicationId: number;
  applicantUserId: number;
  applicantName: string;
  age: number | null;
  currentEmployment: { storeName: string; hireDate: string } | null;
  message: string | null;
  status: JobResponseStatus;
  createdAt: string;
  respondedAt: string | null;
}

/** 매장 구인 공고 조회 — GET /api/stores/{storeId}/job-posting. 공고가 없으면 404. */
export async function fetchMyPosting(storeId: number): Promise<JobPosting | null> {
  try {
    return await apiFetch<JobPosting>(`/api/stores/${storeId}/job-posting`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** 구인 공고 upsert(매장당 1건) — PUT /api/stores/{storeId}/job-posting. */
export function upsertMyPosting(storeId: number, input: JobPostingUpsertInput): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/api/stores/${storeId}/job-posting`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** 매장 지원자 리스트 — GET /api/stores/{storeId}/job-applications. */
export function fetchApplicants(storeId: number): Promise<JobApplicant[]> {
  return apiFetch<JobApplicant[]>(`/api/stores/${storeId}/job-applications`);
}

/** 지원 수락/거절 — PUT /api/job-applications/{id}/respond. 수락 시 지원자에게 초대코드가 알림으로 간다. */
export function respondToApplicant(applicationId: number, accept: boolean): Promise<JobApplicant> {
  return apiFetch<JobApplicant>(`/api/job-applications/${applicationId}/respond`, {
    method: "PUT",
    body: JSON.stringify({ accept }),
  });
}
