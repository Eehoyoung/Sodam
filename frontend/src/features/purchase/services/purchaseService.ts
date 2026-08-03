/**
 * F-BUY-01 매입장부 서비스 — base `/api/stores/{storeId}/purchases`.
 *
 * 전부 사장(@MasterOnly) API. 일부 BE 가 {data: T} 래핑일 수 있어 방어적 파싱.
 */
import api from '../../../common/api/client';
import TokenManager from '../../../common/auth/tokenStore';
import {env} from '../../../common/config/env';
import {
    MonthlySummary,
    Purchase,
    PriceTrend,
    PurchaseListQuery,
    PurchaseSaveRequest,
    ReceiptDraft,
    ReorderHint,
    VendorSummary,
} from '../types';

async function unwrap<T>(promise: Promise<{data: unknown}>): Promise<T> {
    const res = await promise;
    const body = res.data as {data?: unknown};
    return (body?.data !== undefined ? body.data : body) as T;
}

async function unwrapList<T>(promise: Promise<{data: unknown}>): Promise<T[]> {
    const data = await unwrap<unknown>(promise);
    return Array.isArray(data) ? (data as T[]) : [];
}

const base = (storeId: number) => `/api/stores/${storeId}/purchases`;

/** 영수증 이미지 업로드 → OCR 초안(미저장) 반환. */
async function scan(storeId: number, formData: FormData): Promise<ReceiptDraft> {
    return unwrap<ReceiptDraft>(
        api.post(`${base(storeId)}/scan`, formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        }),
    );
}

/** 보정본 확정 저장. */
async function create(storeId: number, body: PurchaseSaveRequest): Promise<Purchase> {
    return unwrap<Purchase>(api.post(base(storeId), body));
}

/** 매입 목록 (from/to/category 필터). */
async function list(storeId: number, query?: PurchaseListQuery): Promise<Purchase[]> {
    return unwrapList<Purchase>(api.get(base(storeId), query));
}

/** 매입 단건 상세. */
async function get(storeId: number, id: number): Promise<Purchase> {
    return unwrap<Purchase>(api.get(`${base(storeId)}/${id}`));
}

/** 매입 수정. */
async function update(storeId: number, id: number, body: PurchaseSaveRequest): Promise<Purchase> {
    return unwrap<Purchase>(api.put(`${base(storeId)}/${id}`, body));
}

/** 매입 삭제. */
async function remove(storeId: number, id: number): Promise<void> {
    await api.delete(`${base(storeId)}/${id}`);
}

/** 품목 단가 가격비교(거래처별 시계열). */
async function priceTrend(storeId: number, item: string): Promise<PriceTrend> {
    return unwrap<PriceTrend>(api.get(`${base(storeId)}/price-trend`, {item}));
}

/** 발주 참고: 품목별 매입주기·수량 (재고관리 아님). */
async function reorder(storeId: number, days = 30): Promise<ReorderHint[]> {
    return unwrapList<ReorderHint>(api.get(`${base(storeId)}/reorder`, {days}));
}

/** 거래처별 매입 집계(기간 내). */
async function vendorSummary(storeId: number, query?: PurchaseListQuery): Promise<VendorSummary[]> {
    return unwrapList<VendorSummary>(api.get(`${base(storeId)}/vendor-summary`, query));
}

/** 최근 N개월(당월 포함) 매입 합계 추이. */
async function monthlySummary(storeId: number, months = 6): Promise<MonthlySummary[]> {
    return unwrapList<MonthlySummary>(api.get(`${base(storeId)}/monthly-summary`, {months}));
}

/** 품목명 자동완성(이 매장에서 과거에 쓴 품목명, 최근순 최대 8개). */
async function itemSuggestions(storeId: number, q: string): Promise<string[]> {
    return unwrapList<string>(api.get(`${base(storeId)}/item-suggestions`, {q}));
}

/**
 * 영수증 원본 이미지 표시용 소스. 인증이 걸린 조회라 `<Image source={...}>`에 바로 쓸 수 있도록
 * Authorization 헤더를 실어 반환한다(공개 정적 서빙 대신 매장 소유 검증을 거치는 이유는
 * 영수증에 거래처·금액이 담겨 공개 URL로 두기엔 부적절하기 때문).
 */
async function receiptImageSource(
    storeId: number,
    imageRef: string,
): Promise<{uri: string; headers: Record<string, string>}> {
    const token = await TokenManager.getAccess();
    return {
        uri: `${env.apiBaseUrl}${base(storeId)}/receipt-image?ref=${encodeURIComponent(imageRef)}`,
        headers: token ? {Authorization: `Bearer ${token}`} : {},
    };
}

const purchaseService = {
    scan,
    create,
    list,
    get,
    update,
    remove,
    priceTrend,
    reorder,
    vendorSummary,
    monthlySummary,
    itemSuggestions,
    receiptImageSource,
};

export default purchaseService;
