/**
 * F-BUY-01 영수증 경량 매입장부 — 타입 정의.
 *
 * 스코프(백로그 4차): "사는 것(매입) 기록·비교"까지만.
 * 재고 자동차감·원가율·메뉴마진·판매연동(POS)은 Non-Goal.
 */

/** 매입 분류 (BE PurchaseCategory enum 과 1:1). */
export type PurchaseCategory =
    | 'VEGETABLE'
    | 'MEAT'
    | 'SEAFOOD'
    | 'LIQUOR'
    | 'BEVERAGE'
    | 'SUPPLIES'
    | 'ETC';

/** 분류 한글 라벨 — UI 표기 단일 출처. */
export const PURCHASE_CATEGORY_LABELS: Record<PurchaseCategory, string> = {
    VEGETABLE: '야채·청과',
    MEAT: '육류',
    SEAFOOD: '수산',
    LIQUOR: '주류',
    BEVERAGE: '음료',
    SUPPLIES: '소모품',
    ETC: '기타',
};

/** FilterChipRow/선택 UI 순서가 보장되도록 명시적 배열. */
export const PURCHASE_CATEGORY_ORDER: PurchaseCategory[] = [
    'VEGETABLE',
    'MEAT',
    'SEAFOOD',
    'LIQUOR',
    'BEVERAGE',
    'SUPPLIES',
    'ETC',
];

/** 매입 상태 (DRAFT: OCR 초안, CONFIRMED: 사장 보정·확정). */
export type PurchaseStatus = 'DRAFT' | 'CONFIRMED';

/** 저장 요청 품목 행. */
export interface PurchaseItemInput {
    itemName: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
}

/** 저장 요청 본문 (create/update 공용). */
export interface PurchaseSaveRequest {
    vendorName: string;
    /** 'YYYY-MM-DD' */
    purchaseDate: string;
    category: PurchaseCategory;
    memo?: string;
    imageRef?: string;
    supplyAmount?: number;
    vatAmount?: number;
    items: PurchaseItemInput[];
}

/** 저장된 매입 품목 (서버 계산 금액 포함). */
export interface PurchaseItem {
    id: number;
    itemName: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    /** 수량 × 단가 (서버 계산) */
    amount: number;
}

/** 매입 단건 응답. */
export interface Purchase {
    id: number;
    vendorName: string;
    /** 'YYYY-MM-DD' */
    purchaseDate: string;
    category: PurchaseCategory;
    categoryLabel: string;
    totalAmount: number;
    supplyAmount?: number;
    vatAmount?: number;
    status: PurchaseStatus;
    memo?: string;
    imageRef?: string;
    items: PurchaseItem[];
}

/** 영수증 스캔(OCR) 초안 품목. */
export interface ReceiptDraftItem {
    itemName: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
}

/** 영수증 스캔(OCR) 초안 — 저장 전 사장 보정 대상. */
export interface ReceiptDraft {
    vendorName: string;
    /** 'YYYY-MM-DD' */
    purchaseDate: string;
    category: PurchaseCategory;
    items: ReceiptDraftItem[];
    /** OCR 공급자 미설정 시 false → 수기 입력 안내 */
    ocrAvailable: boolean;
    /** 스캔 시 서버에 저장된 영수증 원본 키. 저장 요청에 그대로 실어 보내면 매입에 연결된다. */
    imageRef?: string;
    /** 영수증에 인쇄된 합계(인식됐다면). 품목 합계와 다르면 대조 안내에만 쓴다 — 저장값 아님. */
    recognizedTotal?: number;
}

/** 가격 추이 시점 단위. */
export interface PriceTrendPoint {
    /** 'YYYY-MM-DD' */
    date: string;
    vendorName: string;
    unitPrice: number;
    quantity: number;
    unit?: string;
}

/** 품목별 단가 가격비교. */
export interface PriceTrend {
    itemName: string;
    unit?: string;
    currentUnitPrice: number;
    /** 직전 매입 단가 — 이 품목 매입 이력이 1건뿐이면 BE가 null로 응답한다(비교 대상 없음). */
    previousUnitPrice?: number | null;
    /** 지난번 대비 변화율(%) — 양수=인상, 음수=인하. 직전 매입이 없으면 BE가 null로 응답한다. */
    changeRatePercent?: number | null;
    cheapestVendor?: string;
    cheapestUnitPrice?: number;
    points: PriceTrendPoint[];
}

/** 발주 참고(매입주기) 힌트 — 재고관리 아님. */
export interface ReorderHint {
    itemName: string;
    unit?: string;
    purchaseCount: number;
    /** 평균 매입 간격(일) — 기간 내 매입이 1건뿐이면 평균을 낼 수 없어 BE가 null로 응답한다. */
    avgIntervalDays: number | null;
    /** 'YYYY-MM-DD' */
    lastPurchaseDate: string;
    lastQuantity: number;
}

/** 목록 조회 필터. */
export interface PurchaseListQuery {
    /** 'YYYY-MM-DD' */
    from?: string;
    /** 'YYYY-MM-DD' */
    to?: string;
    category?: PurchaseCategory;
}

/** 거래처별 매입 집계(기간 내) — "이번 달 어디에 제일 많이 썼나". */
export interface VendorSummary {
    vendorName: string;
    totalAmount: number;
    purchaseCount: number;
    /** 기간 전체 매입 대비 비중(%) */
    sharePercent: number;
}

/** 최근 N개월 매입 합계 추이의 한 점. 매입 없는 달도 0원으로 채워져 있다. */
export interface MonthlySummary {
    /** 'YYYY-MM' */
    yearMonth: string;
    totalAmount: number;
}
