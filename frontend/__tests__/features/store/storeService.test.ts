import storeService from '../../../src/features/store/services/storeService';
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

// [Test Mapping] Store 의미 정합 — 직전 세션에서 발견·회수한 FE↔BE 의미 미스매치 회귀 방지.
// 화면 FE 라벨: businessNumber=유선전화, storePhoneNumber=휴대폰
// BE 컬럼 의미: Store.businessNumber=사업자등록번호(NOT NULL UNIQUE), storePhoneNumber=대표 연락처
// → service 경계에서 키 의미 맞춰 매핑.

describe('storeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createStore (P2 의미 정합)', () => {
        it('BE 정합: businessNumber 슬롯에 사업자등록번호(businessLicenseNumber) 매핑', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1}});

            await storeService.createStore({
                storeName: '카페 테스트',
                businessNumber: '02-1234-5678', // FE 화면: 유선전화
                storePhoneNumber: '010-2222-3333', // FE 화면: 휴대폰
                businessType: '카페',
                businessLicenseNumber: '1234567890', // FE 화면: 사업자등록번호
                roadAddress: '서울시 강남구',
                storeStandardHourWage: 12000,
            });

            const body = (api.post as jest.Mock).mock.calls[0][1];
            // BE businessNumber 슬롯 ← 사업자등록번호
            expect(body.businessNumber).toBe('1234567890');
            // 휴대폰 우선
            expect(body.storePhoneNumber).toBe('010-2222-3333');
        });

        it('휴대폰 누락 시 유선전화로 fallback', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1}});

            await storeService.createStore({
                storeName: '소담식당',
                businessNumber: '02-1111-2222', // 유선
                businessType: '음식점',
                businessLicenseNumber: '9876543210',
                roadAddress: '서울시',
                storeStandardHourWage: 10000,
            });

            const body = (api.post as jest.Mock).mock.calls[0][1];
            expect(body.businessNumber).toBe('9876543210');
            expect(body.storePhoneNumber).toBe('02-1111-2222');
        });

        it('휴대폰/유선 모두 없으면 빈 문자열 (BE 가 NOT NULL 일 수 있어 미정의는 금지)', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 1}});

            await storeService.createStore({
                storeName: '코드매장',
                businessType: '카페',
                businessLicenseNumber: '1111111111',
                roadAddress: '서울시',
                storeStandardHourWage: 10000,
            });

            const body = (api.post as jest.Mock).mock.calls[0][1];
            expect(body.storePhoneNumber).toBe('');
        });

        it('응답 envelope({data:{id}}) 해체', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {data: {id: 99}}});

            const result = await storeService.createStore({
                storeName: 'X',
                businessType: 'Y',
                businessLicenseNumber: '0000000000',
                roadAddress: 'Z',
                storeStandardHourWage: 9860,
            });

            expect(result.id).toBe(99);
        });
    });

    describe('getMasterStores', () => {
        it('배열 응답 그대로 반환', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: [{id: 1, storeName: '카페 A'}, {id: 2, storeName: '식당 B'}],
            });

            const list = await storeService.getMasterStores(7);

            expect(api.get).toHaveBeenCalledWith('/api/stores/master/7');
            expect(list).toHaveLength(2);
        });

        it('래핑({data:[...]}) 응답 해체', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {data: [{id: 1, storeName: 'X'}]},
            });

            const list = await storeService.getMasterStores(7);

            expect(list).toHaveLength(1);
        });

        it('형식 불일치 시 빈 배열 fallback', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: null});

            const list = await storeService.getMasterStores(7);

            expect(list).toEqual([]);
        });
    });

    describe('getStoreById', () => {
        it('단건 응답', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {id: 5, storeName: '카페', businessType: '카페', storeCode: 'ST5', fullAddress: '서울', storeStandardHourWage: 12000},
            });

            const store = await storeService.getStoreById(5);

            expect(api.get).toHaveBeenCalledWith('/api/stores/5');
            expect(store.id).toBe(5);
        });

        it('래핑된 응답 해체', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {data: {id: 5, storeName: 'A', businessType: 'B', storeCode: 'C', fullAddress: 'D', storeStandardHourWage: 12000}},
            });

            const store = await storeService.getStoreById(5);

            expect(store.id).toBe(5);
        });

        it('잘못된 응답 형식이면 throw', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: {}});

            await expect(storeService.getStoreById(5)).rejects.toThrow('Invalid store data');
        });
    });

    describe('putLocation', () => {
        it('coordinates body 와 함께 PUT', async () => {
            (api.put as jest.Mock).mockResolvedValue({data: {success: true}});

            await storeService.putLocation(7, {latitude: 37.5, longitude: 127.0, radius: 80});

            expect(api.put).toHaveBeenCalledWith(
                '/api/stores/7/location',
                {latitude: 37.5, longitude: 127.0, radius: 80},
            );
        });
    });
});
