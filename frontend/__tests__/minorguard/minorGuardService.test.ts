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
      guardianConsentOnFile: false,
      familyRelationCertOnFile: false,
      workPermitOnFile: false,
      personalDataProcessingBlocked: false,
      guidance: '연소근로자예요',
      disclaimer: '참고용',
    };
    getMock().mockResolvedValueOnce({data: body});

    const res = await fetchMinorGuard(3, 7);

    expect(getMock()).toHaveBeenCalledWith('/api/stores/3/employees/7/minor-guard');
    expect(res).toEqual(body);
  });

  // WP-5: 만 14세 미만 + 친권자 동의서 미확인 시나리오도 응답 그대로 전달한다(변형 없음).
  test('fetchMinorGuard passes through personalDataProcessingBlocked and document checklist as-is', async () => {
    const body: MinorGuard = {
      employeeId: 9,
      minor: true,
      age: 13,
      dailyHourLimit: 7,
      weeklyHourLimit: 35,
      nightWorkRestricted: true,
      consentRequired: true,
      guardianConsentOnFile: false,
      familyRelationCertOnFile: false,
      workPermitOnFile: false,
      personalDataProcessingBlocked: true,
      guidance: '만 14세 미만이에요. 법정대리인 동의 없이는 개인정보 처리를 진행하지 말아 주세요.',
      disclaimer: '참고용',
    };
    getMock().mockResolvedValueOnce({data: body});

    const res = await fetchMinorGuard(3, 9);

    expect(res.personalDataProcessingBlocked).toBe(true);
    expect(res.guardianConsentOnFile).toBe(false);
  });
});
