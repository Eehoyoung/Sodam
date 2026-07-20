import api from '../../../common/api/client';

/**
 * 매장 공지 + 읽음확인 (M-NEW-04/E-NEW-06).
 * 사장: /api/stores/{storeId}/notices (작성·목록·읽은직원)
 * 직원: /api/notices/my (내 공지), /api/notices/{noticeId}/ack (확인했어요)
 * 스코프: 단방향 공지 + 읽음확인만 — 채팅·댓글 없음(Non-Goal).
 */
export interface StoreNotice {
  id: number;
  storeId: number;
  title: string;
  body: string;
  createdAt: string; // ISO LocalDateTime
  readCount: number; // 사장 화면: 읽은 직원 수(N)
  totalEmployees: number; // 사장 화면: 매장 직원 수(M)
  readByMe: boolean; // 직원 화면: 본인 읽음 여부
}

export interface NoticeRead {
  employeeId: number;
  employeeName: string;
  readAt: string; // ISO LocalDateTime
}

export interface NoticeCreateBody {
  title: string;
  body: string;
}

/** 매장 공지 목록(사장). 각 공지의 읽음 N/M 포함. */
export async function fetchStoreNotices(storeId: number): Promise<StoreNotice[]> {
  const {data} = await api.get<StoreNotice[]>(`/api/stores/${storeId}/notices`);
  return data;
}

/** 공지 작성(사장). 발행 시 매장 직원에게 알림 전송. */
export async function createNotice(storeId: number, body: NoticeCreateBody): Promise<StoreNotice> {
  const {data} = await api.post<StoreNotice>(`/api/stores/${storeId}/notices`, body);
  return data;
}

/** 한 공지를 읽은 직원 목록(사장). */
export async function fetchNoticeReads(storeId: number, noticeId: number): Promise<NoticeRead[]> {
  const {data} = await api.get<NoticeRead[]>(`/api/stores/${storeId}/notices/${noticeId}/reads`);
  return data;
}

/** 내 공지 목록(직원). 소속 매장의 공지 + 본인 읽음 여부. */
export async function fetchMyNotices(): Promise<StoreNotice[]> {
  const {data} = await api.get<StoreNotice[]>('/api/notices/my');
  return data;
}

/** 공지 읽음확인(직원). 여러 번 눌러도 1건만 기록(멱등). */
export async function ackNotice(noticeId: number): Promise<void> {
  await api.post(`/api/notices/${noticeId}/ack`);
}

/** ISO 일시를 "6월 17일" 형태로. */
export function formatNoticeDate(iso: string): string {
  if (typeof iso !== 'string' || iso.length < 10) {
    return '';
  }
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!m || !d) {
    return '';
  }
  return `${m}월 ${d}일`;
}
