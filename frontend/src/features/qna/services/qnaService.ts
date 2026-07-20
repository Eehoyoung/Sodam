import api from '../../../common/api/client';

// [API Mapping] QnA APIs — Phase 2 minimal integration

export interface QnAItem { id: number; title: string; content: string; createdAt?: string }

// BE 응답은 {data: T} 래퍼이거나 곧바로 T — 둘 다 허용해 언래핑.
interface ApiEnvelope<T> { data?: T }

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const res = await promise;
  const body = res.data as ApiEnvelope<T> | T;
  const inner = (body as ApiEnvelope<T>)?.data;
  return (inner ?? body) as T;
}

async function list(params?: { page?: number; size?: number; query?: string }): Promise<QnAItem[]> {
  const data = await unwrap<QnAItem[]>(api.get(`/api/qna-info`, params));
  return Array.isArray(data) ? data : [];
}

async function getById(id: number): Promise<QnAItem> {
  return unwrap<QnAItem>(api.get(`/api/qna-info/${id}`));
}

async function create(payload: { title: string; content: string; attachments?: Array<{ name: string; uri: string; type: string }> }): Promise<{ id: number }> {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('content', payload.content);
  (payload.attachments ?? []).forEach((f, idx) => {
    // RN FormData accepts file descriptors but the TS lib types only allow string | Blob.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RN FormData.append 파일 디스크립터: lib.dom 타입(string|Blob)에 미반영
    (form as FormData & { append: (name: string, value: any) => void }).append('files', {
      uri: f.uri,
      name: f.name || `file_${idx}`,
      type: f.type || 'application/octet-stream',
    });
  });

  return unwrap<{ id: number }>(api.post(`/api/qna-info`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }));
}

async function search(query: string): Promise<QnAItem[]> {
  return list({ query });
}

const qnaService = {
  list,
  getById,
  create,
  search,
};

export default qnaService;
