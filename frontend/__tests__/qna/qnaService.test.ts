import qnaService from '../../src/features/qna/services/qnaService';
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

// Polyfill FormData for Node test env
class MockFormData {
  private _fields: Array<[string, any]> = [];
  append(key: string, value: any) {
    this._fields.push([key, value]);
  }
}
// @ts-ignore
(global as any).FormData = MockFormData;

// [Test Mapping] QnA APIs
// - GET /api/site-questions
// - GET /api/site-questions/{id}
// - POST /api/site-questions (multipart)

describe('qnaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('list returns array and calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [{ id: 1, title: 't', content: 'c' }] });

    const result = await qnaService.list({ page: 1, size: 10, query: 'tax' });

    expect(api.get).toHaveBeenCalledWith('/api/site-questions', { page: 1, size: 10, query: 'tax' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(1);
  });

  test('getById returns item and calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 22, title: 'Q', content: 'A' } });

    const item = await qnaService.getById(22);

    expect(api.get).toHaveBeenCalledWith('/api/site-questions/22');
    expect(item.id).toBe(22);
  });

  test('create posts multipart form and returns id', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { id: 333 } });

    const res = await qnaService.create({ title: 'hello', content: 'world', attachments: [{ name: 'a.txt', uri: 'file://a', type: 'text/plain' }] });

    // headers are passed via config, but we focus on endpoint correctness
    expect((api.post as jest.Mock).mock.calls[0][0]).toBe('/api/site-questions');
    expect(res.id).toBe(333);
  });
});
