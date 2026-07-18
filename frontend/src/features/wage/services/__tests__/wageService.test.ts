import wageService from '../wageService';
import api from '../../../../common/utils/api';

jest.mock('../../../../common/utils/api', () => ({
  __esModule: true,
  default: {get: jest.fn(), post: jest.fn(), put: jest.fn()},
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;

describe('wageService — 고용형태(시급제/월급제) 설정', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('월급제 저장 시 employmentType·monthlySalary·socialInsuranceEnrolled 를 body 에 싣고, 시급 필드는 매장 기본으로 정리한다', async () => {
    mockedPost.mockResolvedValueOnce({data: undefined}); // BE 는 200 빈 응답

    await wageService.upsertEmployeeWage({
      employeeId: 3,
      storeId: 1,
      employmentType: 'MONTHLY_SALARY',
      monthlySalary: 2200000,
      socialInsuranceEnrolled: true,
    });

    expect(mockedPost).toHaveBeenCalledWith('/api/wages/employee', {
      employeeId: 3,
      storeId: 1,
      customHourlyWage: null,
      useStoreStandardWage: true,
      employmentType: 'MONTHLY_SALARY',
      monthlySalary: 2200000,
      socialInsuranceEnrolled: true,
    });
  });

  it('시급제 저장 시 socialInsuranceEnrolled 미지정은 null(매장 정책 따름)로, 월급은 null 로 보낸다', async () => {
    mockedPost.mockResolvedValueOnce({data: undefined});

    await wageService.upsertEmployeeWage({
      employeeId: 3,
      storeId: 1,
      hourlyWage: 10500,
      useStoreStandardWage: false,
      employmentType: 'HOURLY',
    });

    expect(mockedPost).toHaveBeenCalledWith('/api/wages/employee', {
      employeeId: 3,
      storeId: 1,
      customHourlyWage: 10500,
      useStoreStandardWage: false,
      employmentType: 'HOURLY',
      monthlySalary: null,
      socialInsuranceEnrolled: null,
    });
  });

  it('employmentType 을 지정하지 않으면(기존 시급-only 호출) 고용형태 관련 키를 아예 보내지 않는다 — BE "변경 없음" 규칙 호환', async () => {
    mockedPost.mockResolvedValueOnce({data: undefined});

    await wageService.upsertEmployeeWage({
      employeeId: 3,
      storeId: 1,
      hourlyWage: 12000,
      useStoreStandardWage: false,
    });

    const body = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(mockedPost).toHaveBeenCalledWith('/api/wages/employee', expect.any(Object));
    expect('employmentType' in body).toBe(false);
    expect('monthlySalary' in body).toBe(false);
    expect('socialInsuranceEnrolled' in body).toBe(false);
    expect(body.customHourlyWage).toBe(12000);
  });

  it('getEmployeeWageInfo 는 전 매장 EmployeeWageInfoDto 목록에서 해당 매장만 골라 반환한다', async () => {
    mockedGet.mockResolvedValueOnce({
      data: [
        {employeeId: 3, storeId: 1, employmentType: 'MONTHLY_SALARY', monthlySalary: 2200000, socialInsuranceEnrolled: false, useStoreStandardWage: true, appliedHourlyWage: 10030},
        {employeeId: 3, storeId: 2, employmentType: 'HOURLY', monthlySalary: null, socialInsuranceEnrolled: null, useStoreStandardWage: false, customHourlyWage: 11000},
      ],
    });

    const info = await wageService.getEmployeeWageInfo(3, 1);

    // 이중래핑 함정 회피: params 없이 경로만 넘긴다
    expect(mockedGet).toHaveBeenCalledWith('/api/payroll/employee/3/wages');
    expect(info).not.toBeNull();
    expect(info?.storeId).toBe(1);
    expect(info?.employmentType).toBe('MONTHLY_SALARY');
    expect(info?.monthlySalary).toBe(2200000);
    expect(info?.socialInsuranceEnrolled).toBe(false);
  });

  it('getEmployeeWageInfo 는 해당 매장 정보가 없으면 null 을 반환한다', async () => {
    mockedGet.mockResolvedValueOnce({data: []});

    const info = await wageService.getEmployeeWageInfo(3, 99);

    expect(info).toBeNull();
  });

  it('formatMonthlyPay — 만원 단위는 "월 220만원", 아니면 "월 2,205,000원"', () => {
    expect(wageService.formatMonthlyPay(2200000)).toBe('월 220만원');
    expect(wageService.formatMonthlyPay(2205000)).toBe('월 2,205,000원');
    expect(wageService.formatMonthlyPay(10000000)).toBe('월 1,000만원');
  });

  it('근로조건 변경은 초안을 만든 뒤 별도 전자서명 발송 API로 시작한다', async () => {
    mockedPost
      .mockResolvedValueOnce({data: {id: 44, status: 'DRAFT', effectiveDate: '2026-07-17', electronicSignatureEnvelopeId: null}})
      .mockResolvedValueOnce({data: {envelopeId: 81}});

    const amendment = await wageService.createEmploymentAmendment(3, {
      employeeId: 9,
      effectiveDate: '2026-07-17',
      employmentType: 'HOURLY',
      hourlyWage: 12000,
    });
    const signature = await wageService.sendEmploymentAmendment(3, amendment.id);

    expect(mockedPost).toHaveBeenNthCalledWith(1, '/api/stores/3/employment-amendments', {
      employeeId: 9,
      effectiveDate: '2026-07-17',
      employmentType: 'HOURLY',
      hourlyWage: 12000,
    });
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/api/stores/3/employment-amendments/44/send');
    expect(signature.envelopeId).toBe(81);
  });
});
