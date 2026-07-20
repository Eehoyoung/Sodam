import attendanceService from '../../../src/features/attendance/services/attendanceService';
import api from '../../../src/common/api/client';

jest.mock('../../../src/common/api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

// [Test Mapping] Attendance 4필드 정합 — silent fail 회귀 방지 (FE_BE_DTO_GAP P0.1~5)
// BE AttendanceRequestDto = {employeeId, storeId, latitude, longitude} 모두 @NotNull
// 이전 회귀: FE 가 workplaceId 만 보내 BE 가 employeeId/lat/lng null 로 400.

describe('attendanceService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkIn', () => {
        it('4필드 모두 정확히 전송: employeeId(Long), storeId(Long), latitude(Double), longitude(Double)', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1, status: 'CHECKED_IN'}});

            await attendanceService.checkIn({
                employeeId: 5,
                workplaceId: '2', // FE 는 string 일 수 있음 — 서비스 경계에서 Number 변환
                latitude: 37.5,
                longitude: 127.0,
            } as any);

            expect(api.post).toHaveBeenCalledWith('/api/attendance/check-in', {
                employeeId: 5,
                storeId: 2,
                latitude: 37.5,
                longitude: 127.0,
                note: undefined,
            });
        });

        it('employeeId 누락 시 INVALID_EMPLOYEE_ID throw (BE 400 회피)', async () => {
            await expect(
                attendanceService.checkIn({
                    workplaceId: '2',
                    latitude: 37.5,
                    longitude: 127.0,
                } as any),
            ).rejects.toThrow('INVALID_EMPLOYEE_ID');

            expect(api.post).not.toHaveBeenCalled();
        });

        it('latitude/longitude 누락 시 INVALID_LOCATION throw', async () => {
            await expect(
                attendanceService.checkIn({
                    employeeId: 5,
                    workplaceId: '2',
                } as any),
            ).rejects.toThrow('INVALID_LOCATION');

            expect(api.post).not.toHaveBeenCalled();
        });

        it('workplaceId 가 숫자 변환 불가하면 INVALID_STORE_ID throw', async () => {
            await expect(
                attendanceService.checkIn({
                    employeeId: 5,
                    workplaceId: 'abc',
                    latitude: 37.5,
                    longitude: 127.0,
                } as any),
            ).rejects.toThrow('INVALID_STORE_ID');
        });

        it('note 옵션 전달', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});

            await attendanceService.checkIn({
                employeeId: 5,
                workplaceId: '2',
                latitude: 37.5,
                longitude: 127.0,
                note: '늦은 출근',
            } as any);

            expect((api.post as jest.Mock).mock.calls[0][1].note).toBe('늦은 출근');
        });
    });

    describe('checkOutStandard', () => {
        it('POST /api/attendance/check-out + 4필드', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1}});

            await attendanceService.checkOutStandard({
                employeeId: 5,
                workplaceId: '2',
                latitude: 37.5,
                longitude: 127.0,
            } as any);

            expect(api.post).toHaveBeenCalledWith('/api/attendance/check-out', {
                employeeId: 5,
                storeId: 2,
                latitude: 37.5,
                longitude: 127.0,
                note: undefined,
            });
        });
    });

    describe('checkOut (deprecated 경로)', () => {
        it('attendanceId 무시하고 body 방식으로 위임', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1}});

            await attendanceService.checkOut('ignored', {
                employeeId: 5,
                workplaceId: '2',
                latitude: 37.5,
                longitude: 127.0,
            } as any);

            expect(api.post).toHaveBeenCalledWith('/api/attendance/check-out', expect.objectContaining({
                employeeId: 5,
                storeId: 2,
            }));
        });
    });
});
