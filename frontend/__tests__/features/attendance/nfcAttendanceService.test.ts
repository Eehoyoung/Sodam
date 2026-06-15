import {
    verifyCheckInByNFC,
    verifyCheckOutByNFC,
} from '../../../src/features/attendance/services/nfcAttendanceService';
import {api} from '../../../src/common/utils/api';

jest.mock('../../../src/common/utils/api', () => ({
    __esModule: true,
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

// [Test Mapping] NFC tagId 키 정합 — silent fail 회귀 방지 (FE_BE_DTO_GAP P0.6)
// BE NfcVerifyRequest = {employeeId, storeId, tagId @NotBlank}
// 이전 회귀: FE 가 nfcTagId 로 보내 BE 가 tagId null → @NotBlank 검증 실패.

describe('nfcAttendanceService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyCheckInByNFC', () => {
        it('tagId 키로 POST /api/attendance/verify/nfc', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {success: true, message: '인증 성공'},
            });

            const result = await verifyCheckInByNFC({
                employeeId: 5,
                storeId: 2,
                tagId: 'STORE_2_20260529120000',
            });

            expect(api.post).toHaveBeenCalledWith('/api/attendance/verify/nfc', {
                employeeId: 5,
                storeId: 2,
                tagId: 'STORE_2_20260529120000',
            });
            expect(result.success).toBe(true);
            expect(result.message).toBe('인증 성공');
        });

        it('ApiResponse 래핑({data:{success,...}}) 자동 해체', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {data: {success: true, message: '인증', timestamp: '2026-05-29T12:00:00'}},
            });

            const result = await verifyCheckInByNFC({
                employeeId: 1, storeId: 1, tagId: 'STORE_1_xx',
            });

            expect(result.success).toBe(true);
            expect(result.timestamp).toBe('2026-05-29T12:00:00');
        });

        it('네트워크 오류 시 success:false + 안내 메시지', async () => {
            (api.post as jest.Mock).mockRejectedValue(new Error('Network'));

            const result = await verifyCheckInByNFC({
                employeeId: 1, storeId: 1, tagId: 'STORE_1_xx',
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('실패');
        });

        it('reason 필드도 message 로 정규화', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {success: false, reason: '태그 만료'},
            });

            const result = await verifyCheckInByNFC({
                employeeId: 1, storeId: 1, tagId: 'STORE_1_xx',
            });

            expect(result.message).toBe('태그 만료');
        });
    });

    describe('verifyCheckOutByNFC', () => {
        it('동일 엔드포인트 사용 + tagId 키', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {success: true}});

            await verifyCheckOutByNFC({
                employeeId: 5,
                storeId: 2,
                tagId: 'STORE_2_20260529180000',
            });

            expect(api.post).toHaveBeenCalled();
            const [url, body] = (api.post as jest.Mock).mock.calls[0];
            expect(url).toBe('/api/attendance/verify/nfc');
            expect(body.tagId).toBe('STORE_2_20260529180000');
        });
    });
});
