import attendanceService from '../../src/features/attendance/services/attendanceService';

// Mock api client used by attendanceService
jest.mock('../../src/common/utils/api', () => {
  const post = jest.fn();
  const get = jest.fn();
  const put = jest.fn();
  const del = jest.fn();
  return {
    __esModule: true,
    default: { post, get, put, delete: del },
    api: { post, get, put, delete: del }
  };
});

import apiDefault, { api } from '../../src/common/utils/api';

// Helper to get the mock functions regardless of default/named import
const getPostMock = () => (api.post as jest.Mock) || ((apiDefault as any).post as jest.Mock);

// [Test API Mapping] Ensure attendance service uses standard endpoints

describe('attendanceService (standard endpoints)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // [contract] toAttendancePayload 는 BE AttendanceRequestDto 4필드(@NotNull)만 전송한다:
  // employeeId/storeId(Long) + latitude/longitude(Double) + note(opt).
  // workplaceId→storeId 매핑, timestamp/nfcTagId 등 비DTO 필드는 제거된다.
  test('checkIn calls POST /api/attendance/check-in with mapped storeId', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { id: 'a1', status: 'CHECKED_IN' } });

    const payload = {
      employeeId: 42,
      workplaceId: '123',
      latitude: 37.5,
      longitude: 127.0,
      note: '정상 출근',
    } as any; // typing from project

    const resp = await attendanceService.checkIn(payload);

    expect(postMock).toHaveBeenCalledWith('/api/attendance/check-in', {
      employeeId: 42,
      storeId: 123,
      latitude: 37.5,
      longitude: 127.0,
      note: '정상 출근',
    });
    expect(resp).toEqual({ id: 'a1', status: 'CHECKED_IN' });
  });

  test('checkOutStandard calls POST /api/attendance/check-out with mapped storeId', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { id: 'a1', status: 'CHECKED_OUT' } });

    const payload = {
      employeeId: 7,
      workplaceId: '77',
      latitude: 37.1,
      longitude: 127.1,
    } as any;

    const resp = await attendanceService.checkOutStandard(payload);

    expect(postMock).toHaveBeenCalledWith('/api/attendance/check-out', {
      employeeId: 7,
      storeId: 77,
      latitude: 37.1,
      longitude: 127.1,
      note: undefined,
    });
    expect(resp).toEqual({ id: 'a1', status: 'CHECKED_OUT' });
  });
});
