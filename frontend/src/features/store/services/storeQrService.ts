import api from '../../../common/api/client';

/**
 * 매장 QR 발급·재발급(사장 전용, WP-C) — QR 출퇴근용 매장 코드.
 * BE: StoreQrCodeController (`/api/stores/{storeId}/qr`).
 *
 * ⚠️ 이 서비스는 "사장이 매장에 게시할 QR을 조회/재발급"하는 관리용이다.
 * "직원이 QR을 스캔해 출퇴근하는" 검증 플로우(attendanceService.checkInWithQr/checkOutWithQr)와는 별개.
 */

/** BE StoreQrCodeController.QrCodeResponse 와 정합. */
export interface StoreQrCode {
    storeId: number;
    token: string;
    issuedAt: string;
    expiresAt: string;
}

// [API Mapping] GET /api/stores/{storeId}/qr — 현재 유효한 QR 조회(없으면 서버가 자동 발급)
export async function fetchStoreQrCode(storeId: number): Promise<StoreQrCode> {
    const {data} = await api.get<StoreQrCode>(`/api/stores/${storeId}/qr`);
    return data;
}

// [API Mapping] POST /api/stores/{storeId}/qr/rotate — QR 재발급(유출 대응, 이전 QR 즉시 무효화)
export async function rotateStoreQrCode(storeId: number): Promise<StoreQrCode> {
    const {data} = await api.post<StoreQrCode>(`/api/stores/${storeId}/qr/rotate`);
    return data;
}

const storeQrService = {
    fetchStoreQrCode,
    rotateStoreQrCode,
};

export default storeQrService;
