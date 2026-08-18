import MockAdapter from 'axios-mock-adapter';
import {__testing__} from '../../../src/common/api/client';
import {getWorkplaceById, getWorkplaces} from '../../../src/features/workplace/services/workplaceService';

// [Test Mapping] H-10 — API 실패 시 __DEV__ 에서 좌표 없는 가짜 매장 3곳을 반환하던 폴백을 제거했다.
// GPS 출퇴근(LocationAttendance)이 그 값을 실제 근무지로 소비해, 존재하지 않는 매장에 출근할 수 있었다.
describe('workplaceService — 실패는 실패로 전파한다', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(__testing__.getClient());
    });
    afterEach(() => {
        mock.restore();
    });

    it('매장 목록 조회 실패 시 가짜 데이터를 반환하지 않고 에러를 던진다', async () => {
        mock.onGet(/\/api\/stores\/master\//).reply(500);

        await expect(getWorkplaces('current')).rejects.toThrow('매장 목록을 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
    });

    it('매장 상세 조회 실패 시 가짜 데이터를 반환하지 않고 에러를 던진다', async () => {
        mock.onGet('/api/stores/1').reply(500);

        await expect(getWorkplaceById('1')).rejects.toThrow('매장 정보를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
    });

    it('성공 시 서버 응답을 그대로 돌려준다', async () => {
        mock.onGet('/api/stores/master/current').reply(200, [{id: '10', name: '소담 광교점', address: '수원시'}]);

        await expect(getWorkplaces('current')).resolves.toEqual([
            {id: '10', name: '소담 광교점', address: '수원시'},
        ]);
    });
});
