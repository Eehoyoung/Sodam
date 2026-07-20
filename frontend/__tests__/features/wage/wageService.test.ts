import wageService from '../../../src/features/wage/services/wageService';
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

// [Test Mapping] Wage 경계 — silent fail 회귀 방지 (FE_BE_DTO_GAP P1)
// BE EmployeeWageUpdateDto = {employeeId, storeId, customHourlyWage(Integer), useStoreStandardWage(Boolean)}
// FE 친화 인터페이스 = {employeeId, storeId, hourlyWage?, useStoreStandardWage?}
// 경계에서 정확히 변환되어야 함 — 키 누락 시 BE 가 묵묵히 무시.

describe('wageService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('upsertEmployeeWage', () => {
        it('hourlyWage 가 있으면 customHourlyWage 로 변환하고 useStoreStandardWage=false 전송', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {employeeId: 1, storeId: 2, customHourlyWage: 12000, useStoreStandardWage: false},
            });

            await wageService.upsertEmployeeWage({employeeId: 1, storeId: 2, hourlyWage: 12000});

            expect(api.post).toHaveBeenCalledWith('/api/wages/employee', {
                employeeId: 1,
                storeId: 2,
                customHourlyWage: 12000,
                useStoreStandardWage: false,
            });
        });

        it('hourlyWage 가 없으면 customHourlyWage=null + useStoreStandardWage=true (매장 기본 시급 사용)', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {employeeId: 5, storeId: 9, customHourlyWage: null, useStoreStandardWage: true},
            });

            await wageService.upsertEmployeeWage({employeeId: 5, storeId: 9});

            expect(api.post).toHaveBeenCalledWith('/api/wages/employee', {
                employeeId: 5,
                storeId: 9,
                customHourlyWage: null,
                useStoreStandardWage: true,
            });
        });

        it('useStoreStandardWage 명시값 우선', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});

            // 명시적으로 매장 기준 사용 선택 (hourlyWage 있어도 무시)
            await wageService.upsertEmployeeWage({
                employeeId: 1,
                storeId: 1,
                hourlyWage: 99999,
                useStoreStandardWage: true,
            });

            expect(api.post).toHaveBeenCalledWith('/api/wages/employee', {
                employeeId: 1,
                storeId: 1,
                customHourlyWage: null,
                useStoreStandardWage: true,
            });
        });

        it('hourlyWage 소수점은 Math.round 로 정수화 (BE Integer)', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});

            await wageService.upsertEmployeeWage({employeeId: 1, storeId: 1, hourlyWage: 12345.67});

            expect((api.post as jest.Mock).mock.calls[0][1].customHourlyWage).toBe(12346);
        });

        it('응답 정규화: useStoreStandardWage=true 면 hourlyWage alias 에 매장 기본 시급', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {
                    employeeId: 1,
                    storeId: 1,
                    customHourlyWage: null,
                    useStoreStandardWage: true,
                    storeStandardHourWage: 10000,
                },
            });

            const result = await wageService.upsertEmployeeWage({employeeId: 1, storeId: 1});

            expect(result.hourlyWage).toBe(10000);
            expect(result.useStoreStandardWage).toBe(true);
            expect(result.customHourlyWage).toBeUndefined();
        });

        it('응답 정규화: useStoreStandardWage=false 면 hourlyWage alias 에 customHourlyWage', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {employeeId: 1, storeId: 1, customHourlyWage: 15000, useStoreStandardWage: false},
            });

            const result = await wageService.upsertEmployeeWage({employeeId: 1, storeId: 1, hourlyWage: 15000});

            expect(result.hourlyWage).toBe(15000);
            expect(result.customHourlyWage).toBe(15000);
            expect(result.useStoreStandardWage).toBe(false);
        });
    });

    describe('putStandardHourlyWage', () => {
        it('storeId 경로 + standardHourlyWage 쿼리 파라미터로 PUT', async () => {
            (api.put as jest.Mock).mockResolvedValue({
                data: {success: true, storeId: 7, standardHourlyWage: 11000},
            });

            await wageService.putStandardHourlyWage(7, 11000);

            expect(api.put).toHaveBeenCalledWith(
                '/api/wages/store/7/standard',
                undefined,
                {params: {standardHourlyWage: 11000}},
            );
        });
    });

    describe('getEmployeeWage', () => {
        it('GET /api/wages/employee/{employeeId}/store/{storeId} 호출 + 응답 정규화', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {employeeId: 3, storeId: 4, customHourlyWage: 13000, useStoreStandardWage: false},
            });

            const result = await wageService.getEmployeeWage(3, 4);

            expect(api.get).toHaveBeenCalledWith('/api/wages/employee/3/store/4');
            expect(result.hourlyWage).toBe(13000);
        });
    });
});
