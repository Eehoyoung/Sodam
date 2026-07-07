import timeOffService from '../../src/features/myPage/services/timeOffService';
import api from '../../src/common/utils/api';

jest.mock('../../src/common/utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// [Test Mapping] 사장 연차/휴가 승인 API — 재작성(옛 계약 폐기, /api/master/timeoff/* 신계약)
// BE: MasterController
//   GET  /api/master/timeoff/pending             → TimeOffResponse[]
//   PUT  /api/master/timeoff/{id}/approve         → TimeOffResponse
//   PUT  /api/master/timeoff/{id}/reject {reason} → TimeOffResponse (reason 필수, 본문 전달)

const sampleResponse = {
  id: 42,
  employeeId: 5,
  employeeName: '홍길동',
  storeId: 2,
  leaveType: 'ANNUAL',
  unit: 'FULL_DAY',
  startDate: '2026-07-10',
  endDate: '2026-07-11',
  startTime: null,
  endTime: null,
  consumedDays: 2,
  reason: '가족 행사',
  rejectReason: null,
  status: 'PENDING',
};

describe('timeOffService (사장 승인)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPendingTimeOffs', () => {
    it('GET /api/master/timeoff/pending 호출 후 배열 반환', async () => {
      (api.get as jest.Mock).mockResolvedValue({data: [sampleResponse]});

      const list = await timeOffService.fetchPendingTimeOffs();

      expect(api.get).toHaveBeenCalledWith('/api/master/timeoff/pending');
      expect(list).toHaveLength(1);
      expect(list[0].employeeName).toBe('홍길동');
    });

    it('응답이 배열이 아니면 빈 배열로 정규화', async () => {
      (api.get as jest.Mock).mockResolvedValue({data: null});

      const list = await timeOffService.fetchPendingTimeOffs();

      expect(list).toEqual([]);
    });
  });

  describe('approveTimeOff', () => {
    it('PUT /api/master/timeoff/{id}/approve 호출', async () => {
      (api.put as jest.Mock).mockResolvedValue({data: {...sampleResponse, status: 'APPROVED'}});

      const result = await timeOffService.approveTimeOff(42);

      expect(api.put).toHaveBeenCalledWith('/api/master/timeoff/42/approve', {});
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('rejectTimeOff', () => {
    it('reason 을 요청 본문에 담아 PUT 호출', async () => {
      (api.put as jest.Mock).mockResolvedValue({
        data: {...sampleResponse, status: 'REJECTED', rejectReason: '인력 공백 우려'},
      });

      const result = await timeOffService.rejectTimeOff(42, '인력 공백 우려');

      expect(api.put).toHaveBeenCalledWith(
        '/api/master/timeoff/42/reject',
        {reason: '인력 공백 우려'},
      );
      expect(result.status).toBe('REJECTED');
      expect(result.rejectReason).toBe('인력 공백 우려');
    });
  });
});
