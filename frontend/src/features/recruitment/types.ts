/**
 * 인증채용(구직·구인) FE 타입 — BE DTO 와 1:1 대응(260711_작업통합.md Part 2 §5).
 *
 * 실제 필드명은 계획서의 JSON 예시가 아니라 아래 실제 구현 파일을 기준으로 한다
 * (계획서와 다르면 실제 구현이 우선 — 지시 원칙):
 *   - backend/src/main/java/com/rich/sodam/dto/request/JobSeekingUpdateRequest.java
 *   - backend/src/main/java/com/rich/sodam/dto/response/JobSeekingProfileResponse.java
 *   - backend/src/main/java/com/rich/sodam/dto/response/JobSeekerListItemResponse.java
 *   - backend/src/main/java/com/rich/sodam/domain/JobAvailabilityDay.java (day/startTime/endTime)
 *   - backend/src/main/java/com/rich/sodam/domain/type/JobCategory.java (12종)
 */

/** 구직 유형 — 당일 대타 / 정기 알바·직원. 복수 선택 가능(§2 #9). */
export type JobSeekingType = 'SUBSTITUTE' | 'REGULAR';

export const SEEKING_TYPE_OPTIONS: JobSeekingType[] = ['SUBSTITUTE', 'REGULAR'];

export const SEEKING_TYPE_LABELS: Record<JobSeekingType, string> = {
    SUBSTITUTE: '당일 대타',
    REGULAR: '정기 알바·직원',
};

/** 업종 분류 12종(§2 #11) — `JobCategory` enum 이름과 1:1. */
export type JobCategoryCode =
    | 'CAFE'
    | 'BAKERY'
    | 'RESTAURANT_HALL'
    | 'KITCHEN'
    | 'FAST_FOOD'
    | 'FAMILY_RESTAURANT'
    | 'CONVENIENCE_STORE'
    | 'MART_SALES'
    | 'PUB_BAR'
    | 'DELIVERY_DRIVING'
    | 'OFFICE_SIDE_JOB'
    | 'ETC';

export const JOB_CATEGORY_CODES: JobCategoryCode[] = [
    'CAFE',
    'BAKERY',
    'RESTAURANT_HALL',
    'KITCHEN',
    'FAST_FOOD',
    'FAMILY_RESTAURANT',
    'CONVENIENCE_STORE',
    'MART_SALES',
    'PUB_BAR',
    'DELIVERY_DRIVING',
    'OFFICE_SIDE_JOB',
    'ETC',
];

export const JOB_CATEGORY_LABELS: Record<JobCategoryCode, string> = {
    CAFE: '카페',
    BAKERY: '베이커리',
    RESTAURANT_HALL: '음식점 홀/서빙',
    KITCHEN: '주방/조리',
    FAST_FOOD: '패스트푸드',
    FAMILY_RESTAURANT: '패밀리레스토랑',
    CONVENIENCE_STORE: '편의점',
    MART_SALES: '마트/판매',
    PUB_BAR: '술집/바',
    DELIVERY_DRIVING: '배달/운전',
    OFFICE_SIDE_JOB: '사무/부업',
    ETC: '기타',
};

/** 업종은 최대 3개(§2 #11), 희망지역은 정확히 2개(§2 #4). */
export const MAX_JOB_CATEGORIES = 3;
export const REQUIRED_LOCATION_COUNT = 2;

/** 요일별 근무가능 시간(§2 #10) — Java `DayOfWeek` enum 이름과 1:1. */
export type JobDayOfWeek =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

export const JOB_DAY_ORDER: JobDayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];

export const JOB_DAY_LABELS_KO: Record<JobDayOfWeek, string> = {
    MONDAY: '월',
    TUESDAY: '화',
    WEDNESDAY: '수',
    THURSDAY: '목',
    FRIDAY: '금',
    SATURDAY: '토',
    SUNDAY: '일',
};

/** BE `JobAvailabilityDay` record — day/startTime/endTime("HH:mm:ss" 문자열). */
export interface JobAvailabilityDay {
    day: JobDayOfWeek;
    startTime: string;
    endTime: string;
}

/** BE `JobSeekingProfileResponse.CurrentEmployment` — 없으면 null → FE "휴직중". */
export interface JobSeekingCurrentEmployment {
    storeName: string;
    hireDate: string; // ISO(YYYY-MM-DD)
}

/** BE `JobSeekingProfileResponse.DesiredLocation` — 좌표 미포함, 주소만. */
export interface JobSeekingDesiredLocation {
    address: string;
}

/** `GET/PUT /api/job-seekers/me` 응답 — `JobSeekingProfileResponse` 1:1. */
export interface JobSeekingProfile {
    eligible: boolean;
    seeking: boolean;
    locations: JobSeekingDesiredLocation[];
    seekingTypes: JobSeekingType[];
    jobCategories: JobCategoryCode[];
    availability: JobAvailabilityDay[];
    currentEmployment: JobSeekingCurrentEmployment | null;
}

/**
 * `PUT /api/job-seekers/me` 요청 바디 — `JobSeekingUpdateRequest` 1:1.
 * `seeking` 만 필수, 나머지는 선택(미전달 시 서버가 기존 저장값 유지 — OFF→ON 복구 사양).
 */
export interface JobSeekingUpdatePayload {
    seeking: boolean;
    locationAddresses?: string[];
    seekingTypes?: JobSeekingType[];
    jobCategories?: JobCategoryCode[];
    availability?: JobAvailabilityDay[];
}

/** `GET /api/stores/{storeId}/job-seekers` 항목 — `JobSeekerListItemResponse` 1:1 (Phase 4 재사용). */
export interface JobSeekerListItem {
    userId: number;
    name: string;
    age: number | null;
    currentEmployment: JobSeekingCurrentEmployment | null;
    desiredLocations: string[];
    seekingTypes: JobSeekingType[];
    jobCategories: JobCategoryCode[];
    categoryMatched: boolean;
    availability: JobAvailabilityDay[];
    availableToday: boolean;
    distanceMeters: number;
    /** 이 매장이 보낸 최신 채용 제안의 유효 상태. 제안을 보낸 적 없으면 null(§15.3 offerStatus 필드 갭 해소). */
    offerStatus: JobResponseStatus | null;
}

/** `GET /api/stores/{storeId}/job-seekers` 선택 쿼리 필터(Phase 4 재사용). */
export interface JobSeekerListFilters {
    workType?: JobSeekingType;
    availableOn?: string; // YYYY-MM-DD
}

/** §5.4 에러 코드 — FE 분기용(api-design.md). */
export type JobSeekingErrorCode =
    | 'JOB_SEEKING_NOT_ELIGIBLE'
    | 'JOB_SEEKING_LOCATIONS_REQUIRED'
    | 'JOB_SEEKING_AVAILABILITY_REQUIRED'
    | 'JOB_SEEKING_INVALID_DAYS'
    | 'JOB_SEEKING_TYPES_REQUIRED'
    | 'JOB_SEEKING_CATEGORIES_INVALID'
    | 'STORE_LOCATION_NOT_SET'
    | 'ENTITY_NOT_FOUND';

export const JOB_SEEKING_ERROR_MESSAGES: Record<JobSeekingErrorCode, string> = {
    JOB_SEEKING_NOT_ELIGIBLE: '소담으로 출퇴근한 이력이 있어야 이용할 수 있어요.',
    JOB_SEEKING_LOCATIONS_REQUIRED: '희망지역을 2곳 모두 선택해 주세요.',
    JOB_SEEKING_AVAILABILITY_REQUIRED: '근무 가능한 요일을 1개 이상 선택해 주세요.',
    JOB_SEEKING_INVALID_DAYS: '근무 가능 시간을 다시 확인해 주세요. 종료 시간은 시작 시간보다 늦어야 해요.',
    JOB_SEEKING_TYPES_REQUIRED: '구직 유형을 1개 이상 선택해 주세요.',
    JOB_SEEKING_CATEGORIES_INVALID: '업종은 1~3개 선택해 주세요.',
    STORE_LOCATION_NOT_SET: '매장 위치가 아직 설정되지 않았어요.',
    ENTITY_NOT_FOUND: '정보를 찾을 수 없어요.',
};

/**
 * Phase 6 — 매칭 왕복(제안·공고·지원) 타입. BE DTO 와 1:1 대응(계획서와 다르면 실제 구현이 우선):
 *   - backend/.../dto/request/{JobOfferCreateRequest,JobOfferRespondRequest,
 *     JobPostingUpsertRequest,JobApplicationCreateRequest,JobApplicationRespondRequest}.java
 *   - backend/.../dto/response/{JobOfferResponse,JobPostingResponse,JobPostingNearbyItemResponse,
 *     JobApplicationResponse,JobApplicantListItemResponse}.java
 */

/** 제안/지원 상태머신 — JobResponseStatus(BE) 1:1. 만료는 조회 시점 lazy 판정 결과. */
export type JobResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export const JOB_RESPONSE_STATUS_LABELS: Record<JobResponseStatus, string> = {
    PENDING: '대기중',
    ACCEPTED: '수락됨',
    DECLINED: '거절됨',
    EXPIRED: '만료됨',
};

/** 상태 뱃지 톤 — `AppBadge` 의 `BadgeTone` 과 정합. 사장/직원 화면 공용(중복 정의 금지). */
export const JOB_RESPONSE_STATUS_TONE: Record<JobResponseStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
    PENDING: 'warning',
    ACCEPTED: 'success',
    DECLINED: 'error',
    EXPIRED: 'neutral',
};

/**
 * 구직자 리스트 카드 인라인 제안 상태 뱃지 문구(§16.2-6, offerStatus 필드 갭 해소) — 카드 안의 다른
 * 뱃지(유형/업종일치/오늘가능)와 구분되도록 "제안" 접두를 붙인다. 톤은 `JOB_RESPONSE_STATUS_TONE` 을
 * 그대로 재사용한다(사장/직원 화면 공용, 중복 정의 금지).
 */
export const OFFER_STATUS_BADGE_LABELS: Record<JobResponseStatus, string> = {
    PENDING: '제안 대기중',
    ACCEPTED: '제안 수락됨',
    DECLINED: '제안 거절됨',
    EXPIRED: '제안 만료',
};

// ── §15 채용 제안(JobOffer) — 사장→직원 ────────────────────────────────

/** `POST /api/stores/{storeId}/job-offers` 요청 — `JobOfferCreateRequest` 1:1. */
export interface JobOfferCreatePayload {
    targetUserId: number;
    workType: JobSeekingType;
    workDate?: string | null; // YYYY-MM-DD, SUBSTITUTE 는 필수
    startTime: string; // "HH:mm:ss"
    endTime: string;
    hourlyWage: number;
    message?: string;
}

/** `GET /api/job-offers/me` · `PUT /api/job-offers/{id}/respond` 응답 — `JobOfferResponse` 1:1.
 * `storeCode` 는 status=ACCEPTED 일 때만 값 존재(PII 최소화). */
export interface JobOffer {
    id: number;
    storeId: number;
    storeName: string;
    workType: JobSeekingType;
    workDate: string | null;
    startTime: string;
    endTime: string;
    hourlyWage: number;
    message: string | null;
    status: JobResponseStatus;
    expiresAt: string; // LocalDateTime "YYYY-MM-DDTHH:mm:ss"(Asia/Seoul, offset 없음)
    createdAt: string;
    respondedAt: string | null;
    storeCode: string | null;
}

export type JobOfferErrorCode =
    | 'OFFER_ALREADY_PENDING'
    | 'OFFER_NOT_PENDING'
    | 'OFFER_TARGET_NOT_SEEKING'
    | 'OFFER_TYPE_MISMATCH'
    | 'JOB_OFFER_WORK_DATE_REQUIRED'
    | 'JOB_OFFER_INVALID_WORK_TYPE';

export const JOB_OFFER_ERROR_MESSAGES: Record<JobOfferErrorCode, string> = {
    OFFER_ALREADY_PENDING: '이미 대기중인 제안이 있어요.',
    OFFER_NOT_PENDING: '이미 응답했거나 만료된 제안이에요.',
    OFFER_TARGET_NOT_SEEKING: '구직중이 아닌 상대에게는 제안을 보낼 수 없어요.',
    OFFER_TYPE_MISMATCH: '구직자가 원하는 근무 형태가 아니에요.',
    JOB_OFFER_WORK_DATE_REQUIRED: '대타 제안은 근무일을 입력해 주세요.',
    JOB_OFFER_INVALID_WORK_TYPE: '근무 형태가 올바르지 않아요.',
};

// ── §19 구인 공고(JobPosting) — 매장당 1건 ──────────────────────────────

/** `PUT /api/stores/{storeId}/job-posting` 요청 — `JobPostingUpsertRequest` 1:1. */
export interface JobPostingUpsertPayload {
    workType: JobSeekingType;
    jobCategory: JobCategoryCode;
    workDate?: string | null;
    startTime: string;
    endTime: string;
    hourlyWage: number;
    message?: string;
    open: boolean;
}

/** `PUT/GET /api/stores/{storeId}/job-posting` 응답 — `JobPostingResponse` 1:1. */
export interface JobPosting {
    id: number;
    storeId: number;
    storeName: string;
    workType: JobSeekingType;
    jobCategory: JobCategoryCode;
    workDate: string | null;
    startTime: string;
    endTime: string;
    hourlyWage: number;
    message: string | null;
    open: boolean;
    createdAt: string;
    updatedAt: string;
}

/** `GET /api/job-postings/nearby` 항목 — `JobPostingNearbyItemResponse` 1:1. */
export interface JobPostingNearbyItem {
    postingId: number;
    storeId: number;
    storeName: string;
    workType: JobSeekingType;
    jobCategory: JobCategoryCode;
    workDate: string | null;
    startTime: string;
    endTime: string;
    hourlyWage: number;
    message: string | null;
    distanceMeters: number;
}

export interface JobPostingNearbyFilters {
    workType?: JobSeekingType;
    category?: JobCategoryCode;
}

export type JobPostingErrorCode =
    | 'JOB_POSTING_WORK_DATE_REQUIRED'
    | 'JOB_POSTING_INVALID_WORK_TYPE'
    | 'JOB_POSTING_INVALID_CATEGORY';

export const JOB_POSTING_ERROR_MESSAGES: Record<JobPostingErrorCode, string> = {
    JOB_POSTING_WORK_DATE_REQUIRED: '대타 공고는 근무일을 입력해 주세요.',
    JOB_POSTING_INVALID_WORK_TYPE: '근무 형태가 올바르지 않아요.',
    JOB_POSTING_INVALID_CATEGORY: '업종이 올바르지 않아요.',
};

// ── §19 구인 공고 지원(JobApplication) — 직원→사장 ──────────────────────

/** `POST /api/job-postings/{postingId}/applications` 요청 — `JobApplicationCreateRequest` 1:1. */
export interface JobApplicationCreatePayload {
    message?: string;
}

/** `POST .../applications` · `GET /api/job-applications/me` 응답(지원자 관점) —
 * `JobApplicationResponse` 1:1. `storeCode` 는 status=ACCEPTED 일 때만 값 존재. */
export interface JobApplication {
    id: number;
    postingId: number;
    storeId: number;
    storeName: string;
    workType: JobSeekingType;
    jobCategory: JobCategoryCode;
    workDate: string | null;
    startTime: string;
    endTime: string;
    hourlyWage: number;
    message: string | null;
    status: JobResponseStatus;
    createdAt: string;
    respondedAt: string | null;
    storeCode: string | null;
}

/** `GET /api/stores/{storeId}/job-applications` 항목 · `PUT .../respond` 응답(사장 관점) —
 * `JobApplicantListItemResponse` 1:1. */
export interface JobApplicantListItem {
    applicationId: number;
    applicantUserId: number;
    applicantName: string;
    age: number | null;
    currentEmployment: JobSeekingCurrentEmployment | null;
    message: string | null;
    status: JobResponseStatus;
    createdAt: string;
    respondedAt: string | null;
}

export type JobApplicationErrorCode =
    | 'POSTING_CLOSED'
    | 'APPLICATION_ALREADY_PENDING'
    | 'APPLICATION_NOT_PENDING'
    | 'JOB_APPLICATION_NOT_ELIGIBLE';

export const JOB_APPLICATION_ERROR_MESSAGES: Record<JobApplicationErrorCode, string> = {
    POSTING_CLOSED: '마감된 공고예요.',
    APPLICATION_ALREADY_PENDING: '이미 지원했어요.',
    APPLICATION_NOT_PENDING: '이미 응답했거나 마감된 지원이에요.',
    JOB_APPLICATION_NOT_ELIGIBLE: '소담으로 출퇴근한 이력이 있어야 지원할 수 있어요.',
};
