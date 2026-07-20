import {
  fetchTaxReportHistory,
  sendTaxReport,
  updateAccountantEmail,
} from '../taxReportService';
import api from '../../../../common/api/client';

jest.mock('../../../../common/api/client', () => ({
  __esModule: true,
  default: {get: jest.fn(), post: jest.fn(), put: jest.fn()},
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;
const mockedPut = api.put as jest.Mock;

const sampleLog = {
  id: 1,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  recipientEmail: 'cpa@tax.kr',
  payrollCount: 3,
  totalGrossWage: 5400000,
  status: 'SENT',
  sentAt: '2026-07-04T10:00:00',
};

describe('taxReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('발송 이력을 조회한다', async () => {
    mockedGet.mockResolvedValueOnce({data: [sampleLog]});

    const res = await fetchTaxReportHistory(1);

    expect(mockedGet).toHaveBeenCalledWith('/api/stores/1/tax-reports/history');
    expect(res).toHaveLength(1);
    expect(res[0].recipientEmail).toBe('cpa@tax.kr');
  });

  it('발송 요청은 기간·force를 쿼리 파라미터로 보낸다 (config.params — 이중래핑 함정 회피)', async () => {
    mockedPost.mockResolvedValueOnce({data: sampleLog});

    const res = await sendTaxReport(1, '2026-06-01', '2026-06-30', true);

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/stores/1/tax-reports/send',
      undefined,
      {params: {from: '2026-06-01', to: '2026-06-30', force: true}},
    );
    expect(res.status).toBe('SENT');
  });

  it('세무사 이메일을 저장하고, 빈 문자열은 null(해제)로 보낸다', async () => {
    mockedPut.mockResolvedValue({data: undefined});

    await updateAccountantEmail(1, 'cpa@tax.kr');
    expect(mockedPut).toHaveBeenCalledWith(
      '/api/stores/1/tax-reports/accountant-email',
      {email: 'cpa@tax.kr'},
    );

    await updateAccountantEmail(1, '');
    expect(mockedPut).toHaveBeenLastCalledWith(
      '/api/stores/1/tax-reports/accountant-email',
      {email: null},
    );
  });
});
