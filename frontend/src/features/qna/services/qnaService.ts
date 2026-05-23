import api from '../../../common/utils/api';

// [API Mapping] QnA APIs — Phase 2 minimal integration

export interface QnAItem { id: number; title: string; content: string; createdAt?: string }

async function unwrap<T = any>(promise: Promise<{ data: any }>): Promise<T> {
  const res = await promise;
  const body: any = res.data;
  return (body?.data ?? body) as T;
}

async function list(params?: { page?: number; size?: number; query?: string }): Promise<QnAItem[]> {
  const data = await unwrap<any>(api.get(`/api/site-questions`, params as any));
  return Array.isArray(data) ? data : [];
}

async function getById(id: number): Promise<QnAItem> {
  return unwrap<QnAItem>(api.get(`/api/site-questions/${id}`));
}

async function create(payload: { title: string; content: string; attachments?: Array<{ name: string; uri: string; type: string }> }): Promise<{ id: number }> {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('content', payload.content);
  (payload.attachments || []).forEach((f, idx) => {
    // RN FormData accepts file descriptors but the TS lib types only allow string | Blob.
    (form as any).append('files', {
      uri: f.uri,
      name: f.name || `file_${idx}`,
      type: f.type || 'application/octet-stream',
    });
  });

  return unwrap<{ id: number }>(api.post(`/api/site-questions`, form as any, {
    headers: { 'Content-Type': 'multipart/form-data' }
  } as any));
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
