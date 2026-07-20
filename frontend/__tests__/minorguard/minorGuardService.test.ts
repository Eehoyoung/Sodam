import {fetchMinorGuard, MinorGuard} from '../../src/features/minorguard/services/minorGuardService';

jest.mock('../../src/common/api/client', () => {
  const get = jest.fn();
  return {__esModule: true, default: {get}, api: {get}};
});

import apiDefault from '../../src/common/api/client';

const getMock = () => (apiDefault as unknown as {get: jest.Mock}).get;

describe('minorGuardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // [contract] L-NEW-01: GET /api/stores/{storeId}/employees/{employeeId}/minor-guard
  test('fetchMinorGuard calls store/employee scoped endpoint and returns body', async () => {
    const body: MinorGuard = {
      employeeId: 7,
      minor: true,
      age: 17,
      dailyHourLimit: 7,
      weeklyHourLimit: 35,
      nightWorkRestricted: true,
      consentRequired: true,
      guidance: '연소근로자예요',
      disclaimer: '참고용',
    };
    getMock().mockResolvedValueOnce({data: body});

    const res = await fetchMinorGuard(3, 7);

    expect(getMock()).toHaveBeenCalledWith('/api/stores/3/employees/7/minor-guard');
    expect(res).toEqual(body);
  });
});
