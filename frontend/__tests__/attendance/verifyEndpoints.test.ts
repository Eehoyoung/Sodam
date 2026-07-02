import { verifyCheckInByNFC, verifyCheckOutByNFC } from '../../src/features/attendance/services/nfcAttendanceService';
import { verifyCheckInByLocation, verifyCheckOutByLocation } from '../../src/features/attendance/services/locationAttendanceService';

jest.mock('../../src/common/utils/api', () => {
  const post = jest.fn();
  return {
    __esModule: true,
    api: { post },
    default: { post },
  };
});

import apiDefault, { api } from '../../src/common/utils/api';

const getPostMock = () => (api.post as jest.Mock) || ((apiDefault as any).post as jest.Mock);

describe('verify endpoints standardization and response unwrapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('NFC check-in uses /api/attendance/verify/nfc and unwraps ApiResponse', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { data: { success: true, reason: 'VALID_TAG' } } });

    const res = await verifyCheckInByNFC({ employeeId: 1, storeId: 2, nfcTagId: 'TAG' });

    expect(postMock).toHaveBeenCalledWith('/api/attendance/verify/nfc', { employeeId: 1, storeId: 2, nfcTagId: 'TAG' });
    expect(res).toEqual({ success: true, message: 'VALID_TAG', timestamp: undefined });
  });

  test('NFC check-out sets isCheckOut flag and maps reason→message', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { success: false, reason: 'TAG_NOT_FOUND' } });

    const res = await verifyCheckOutByNFC({ employeeId: 1, storeId: 2, nfcTagId: 'TAG' });

    expect(postMock).toHaveBeenCalledWith('/api/attendance/verify/nfc', { employeeId: 1, storeId: 2, nfcTagId: 'TAG', isCheckOut: true });
    expect(res).toEqual({ success: false, message: 'TAG_NOT_FOUND', timestamp: undefined });
  });

  test('Location check-in uses /api/attendance/verify/location and unwraps ApiResponse', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { data: { success: true, reason: 'WITHIN_RADIUS', distance: 8 } } });

    const res = await verifyCheckInByLocation({ employeeId: 3, storeId: 7, latitude: 1.23, longitude: 4.56 });

    expect(postMock).toHaveBeenCalledWith('/api/attendance/verify/location', { employeeId: 3, storeId: 7, latitude: 1.23, longitude: 4.56 });
    expect(res).toEqual({ success: true, message: 'WITHIN_RADIUS', distance: 8, timestamp: undefined });
  });

  test('Location check-out sets isCheckOut flag and maps reason', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { success: false, reason: 'OUT_OF_RADIUS', distance: 120 } });

    const res = await verifyCheckOutByLocation({ employeeId: 5, storeId: 9, latitude: 9.87, longitude: 6.54 });

    expect(postMock).toHaveBeenCalledWith('/api/attendance/verify/location', { employeeId: 5, storeId: 9, latitude: 9.87, longitude: 6.54, isCheckOut: true });
    expect(res).toEqual({ success: false, message: 'OUT_OF_RADIUS', distance: 120, timestamp: undefined });
  });
});
