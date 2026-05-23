import {api} from '../../../common/utils/api';

// [API Mapping] NFC verify standardized; legacy NFC verify endpoint fallback removed per Phase 0 AC (2025-10-02).

export interface NFCVerifyRequest {
    employeeId: number;
    storeId: number;
    nfcTagId: string;
}

export interface NFCVerifyResponse {
    success: boolean;
    message?: string;
    timestamp?: string;
}

/**
 * NFC 태그 기반 출근 인증 API
 * @param request NFC 태그 인증 요청 데이터
 * @returns 인증 결과
 */
export const verifyCheckInByNFC = async (
    request: NFCVerifyRequest
): Promise<NFCVerifyResponse> => {
    try {
        const response = await api.post<any>(
            '/api/attendance/verify/nfc',
            request
        );
        const raw = response.data;
        const data = raw?.data ?? raw; // ApiResponse 래핑/비래핑 모두 허용
        return {
            success: !!data?.success,
            message: data?.message ?? data?.reason,
            timestamp: data?.timestamp,
        };
    } catch (error) {
        console.error('NFC 태그 기반 출근 인증 실패:', error);
        // Legacy NFC verify endpoint fallback removed per Phase 0 AC (2025-10-02)
        return {
            success: false,
            message: 'NFC 태그 기반 출근 인증에 실패했습니다. 다시 시도해주세요.'
        };
    }
};

/**
 * NFC 태그 기반 퇴근 인증 API
 * @param request NFC 태그 인증 요청 데이터
 * @returns 인증 결과
 */
export const verifyCheckOutByNFC = async (
    request: NFCVerifyRequest
): Promise<NFCVerifyResponse> => {
    try {
        // 출근과 동일한 엔드포인트를 사용하지만, 퇴근 플래그 추가(서버가 무시해도 무방)
        const response = await api.post<any>(
            '/api/attendance/verify/nfc',
            {
                ...request,
                isCheckOut: true
            }
        );
        const raw = response.data;
        const data = raw?.data ?? raw; // ApiResponse 래핑/비래핑 모두 허용
        return {
            success: !!data?.success,
            message: data?.message ?? data?.reason,
            timestamp: data?.timestamp,
        };
    } catch (error) {
        console.error('NFC 태그 기반 퇴근 인증 실패:', error);
        // Legacy NFC verify endpoint fallback removed per Phase 0 AC (2025-10-02)
        return {
            success: false,
            message: 'NFC 태그 기반 퇴근 인증에 실패했습니다. 다시 시도해주세요.'
        };
    }
};

/**
 * 매장별 NFC 태그 생성 API
 * @param storeId 매장 ID
 * @param tagType NFC 태그 타입 (ndef, mifare, iso14443)
 * @returns NFC 태그 데이터 또는 설정 정보
 */
export const generateStoreNFCTag = async (
    storeId: number,
    tagType: 'ndef' | 'mifare' | 'iso14443' = 'ndef'
): Promise<string> => {
    try {
        const response = await api.get<{ nfcTagData: string }>(
            `/api/stores/${storeId}/nfc-tag`,
            {
                params: {tagType}
            }
        );
        return response.data.nfcTagData;
    } catch (error) {
        console.error('NFC 태그 생성 실패:', error);
        throw new Error('NFC 태그 생성에 실패했습니다. 다시 시도해주세요.');
    }
};

/**
 * NFC 태그 데이터 파싱
 * NFC 태그 데이터는 일반적으로 JSON 형식으로 인코딩되어 있거나 태그 ID 자체를 사용
 * @param nfcData NFC 태그에서 읽은 데이터
 * @returns 파싱된 NFC 태그 데이터
 */
export const parseNFCTagData = (nfcData: string): { storeId: number; timestamp: string } | null => {
    try {
        // 먼저 JSON 형식으로 파싱 시도
        try {
            const parsedData = JSON.parse(nfcData);

            // 필수 필드 확인
            if (!parsedData.storeId || !parsedData.timestamp) {
                throw new Error('유효하지 않은 NFC 태그 형식입니다.');
            }

            return {
                storeId: parsedData.storeId,
                timestamp: parsedData.timestamp
            };
        } catch (jsonError) {
            // JSON 파싱 실패 시, 태그 ID 기반 파싱 시도
            console.log('[DEBUG_LOG] NFC 태그 JSON 파싱 실패, 태그 ID 기반 파싱 시도:', jsonError);

            // 태그 ID가 특정 패턴을 따르는 경우 (예: "STORE_123_20240804120000")
            const tagIdPattern = /^STORE_(\d+)_(\d{14})$/;
            const match = nfcData.match(tagIdPattern);

            if (match) {
                const storeId = parseInt(match[1], 10);
                const timestampStr = match[2];

                // 타임스탬프 형식 변환 (YYYYMMDDHHMMSS -> ISO string)
                const year = timestampStr.substring(0, 4);
                const month = timestampStr.substring(4, 6);
                const day = timestampStr.substring(6, 8);
                const hour = timestampStr.substring(8, 10);
                const minute = timestampStr.substring(10, 12);
                const second = timestampStr.substring(12, 14);

                const timestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();

                return {
                    storeId,
                    timestamp
                };
            }

            // 단순 태그 ID인 경우, 현재 시간을 타임스탬프로 사용하고 태그 ID에서 매장 ID 추출 시도
            const simpleStoreIdPattern = /(\d+)/;
            const storeIdMatch = nfcData.match(simpleStoreIdPattern);

            if (storeIdMatch) {
                return {
                    storeId: parseInt(storeIdMatch[1], 10),
                    timestamp: new Date().toISOString()
                };
            }

            throw new Error('NFC 태그 데이터에서 매장 정보를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('NFC 태그 데이터 파싱 실패:', error);
        return null;
    }
};

/**
 * NFC 태그 유효성 검사
 * @param timestamp NFC 태그 생성 시간
 * @param expiryMinutes NFC 태그 유효 시간 (분)
 * @returns 유효 여부
 */
export const isNFCTagValid = (timestamp: string, expiryMinutes: number = 30): boolean => {
    try {
        const generatedTime = new Date(timestamp).getTime();
        const currentTime = new Date().getTime();
        const diffMinutes = (currentTime - generatedTime) / (1000 * 60);

        // NFC 태그 기본 유효 시간은 30분입니다.
        return diffMinutes <= expiryMinutes;
    } catch (error) {
        console.error('NFC 태그 유효성 검사 실패:', error);
        return false;
    }
};

/**
 * NFC 태그 데이터 생성 (매장에서 NFC 태그를 작성할 때 사용)
 * @param storeId 매장 ID
 * @param expiryHours 태그 유효 시간 (시간)
 * @returns NFC 태그에 쓸 데이터
 */
export const createNFCTagData = (storeId: number, expiryHours: number = 24): string => {
    const timestamp = new Date().toISOString();
    const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const tagData = {
        storeId,
        timestamp,
        expiryTime,
        version: '1.0',
        type: 'attendance'
    };

    return JSON.stringify(tagData);
};

/**
 * NFC 태그 쓰기 (매장 관리자용)
 * @param tagData 태그에 쓸 데이터
 * @returns 쓰기 성공 여부
 */
export const writeNFCTag = async (tagData: string): Promise<boolean> => {
    try {
        // 실제 NFC 태그 쓰기는 react-native-nfc-manager를 통해 구현
        // 여기서는 서비스 레이어에서 데이터 검증만 수행

        // 데이터 유효성 검사
        const parsedData = parseNFCTagData(tagData);
        if (!parsedData) {
            throw new Error('유효하지 않은 태그 데이터입니다.');
        }

        console.log('[DEBUG_LOG] NFC 태그 데이터 검증 완료:', parsedData);
        return true;
    } catch (error) {
        console.error('NFC 태그 쓰기 검증 실패:', error);
        return false;
    }
};

/**
 * 매장의 NFC 태그 설정 조회
 * @param storeId 매장 ID
 * @returns NFC 태그 설정 정보
 */
export const getStoreNFCSettings = async (storeId: number) => {
    try {
        const response = await api.get(`/api/stores/${storeId}/nfc-settings`);
        return response.data;
    } catch (error) {
        console.error('매장 NFC 설정 조회 실패:', error);
        throw new Error('매장 NFC 설정을 조회할 수 없습니다.');
    }
};

/**
 * 매장의 NFC 태그 설정 업데이트
 * @param storeId 매장 ID
 * @param settings NFC 태그 설정
 * @returns 업데이트 결과
 */
export const updateStoreNFCSettings = async (
    storeId: number,
    settings: {
        tagType: 'ndef' | 'mifare' | 'iso14443';
        expiryHours: number;
        autoRefresh: boolean;
    }
) => {
    try {
        const response = await api.put(`/api/stores/${storeId}/nfc-settings`, settings);
        return response.data;
    } catch (error) {
        console.error('매장 NFC 설정 업데이트 실패:', error);
        throw new Error('매장 NFC 설정 업데이트에 실패했습니다.');
    }
};
