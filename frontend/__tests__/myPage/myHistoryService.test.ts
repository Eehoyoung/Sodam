import myHistoryService from '../../src/features/myPage/services/myHistoryService';
import api from '../../src/common/api/client';

jest.mock('../../src/common/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// [Test Mapping] 본인 스코프 근무 이력 (WP-H·K.2)
// - GET /api/me/history/attendance
// - GET /api/me/history/contracts
// - GET /api/me/history/attendance.csv

describe('myHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('출퇴근 이력은 본인 스코프 경로를 호출한다 — 경로에 storeId가 없다', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { items: [], page: 0, size: 30, totalElements: 0, hasNext: false } });

    await myHistoryService.fetchMyAttendance(0, 30);

    const [url] = (api.get as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/me/history/attendance');
    // 매장 스코프였다면 경로에 storeId가 들어간다. 본인 스코프라는 게 이 API의 BOLA 방어 근거다.
    expect(url).not.toContain('stores');
  });

  test('페이지 파라미터는 이중 래핑 없이 2번째 인자로 전달한다', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { items: [], page: 1, size: 30, totalElements: 0, hasNext: false } });

    await myHistoryService.fetchMyAttendance(1, 30);

    const [, params] = (api.get as jest.Mock).mock.calls[0];
    // api.get(url, {params: {...}}) 로 감싸면 쿼리가 전송되지 않는 알려진 함정(api-get-param-double-wrap).
    expect(params).toEqual({ page: 1, size: 30 });
    expect(params).not.toHaveProperty('params');
  });

  test('근로계약 이력도 본인 스코프 경로를 호출한다', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    await myHistoryService.fetchMyContracts();

    expect((api.get as jest.Mock).mock.calls[0][0]).toBe('/api/me/history/contracts');
  });

  test('CSV는 text 응답으로 받는다 — 네이티브 파일 저장 라이브러리가 없어 공유 시트로 내보낸다', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: '매장,날짜\n' });

    const csv = await myHistoryService.fetchMyAttendanceCsv();

    const [url, params, config] = (api.get as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/me/history/attendance.csv');
    expect(params).toBeUndefined();
    expect(config).toEqual({ responseType: 'text' });
    expect(csv).toContain('매장');
  });
});
