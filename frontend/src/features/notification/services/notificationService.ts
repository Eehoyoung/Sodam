import api from '../../../common/utils/api';

export interface InboxItem {
    id: number;
    category: 'ATTENDANCE' | 'PAYROLL' | 'BILLING' | 'NOTICE' | 'MARKETING' | 'SYSTEM';
    title: string;
    body: string;
    deepLink?: string;
    isRead: boolean;
    createdAt: string;
}

const notificationService = {
    // [API Mapping] GET /api/notifications/inbox — 알림함 목록(페이지네이션)
    listInbox: async (page = 0, size = 50): Promise<InboxItem[]> => {
        const res = await api.get<InboxItem[]>(`/api/notifications/inbox?page=${page}&size=${size}`);
        return res.data ?? [];
    },

    // [API Mapping] POST /api/notifications/inbox/{id}/read — 읽음 처리
    markRead: async (id: number): Promise<void> => {
        await api.post(`/api/notifications/inbox/${id}/read`);
    },

    // [API Mapping] POST /api/notifications/push-to-employee — 사장이 직원에게 즉시 푸시(MasterOnly)
    pushToEmployee: async (employeeId: number, title: string, body: string): Promise<void> => {
        await api.post('/api/notifications/push-to-employee', {employeeId, title, body});
    },
};

export default notificationService;
