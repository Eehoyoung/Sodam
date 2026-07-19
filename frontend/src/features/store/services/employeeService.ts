import api from '../../../common/utils/api';

export interface EmployeeDetail {
    id: number;
    name: string;
    email: string;
    role: string;
}

const employeeService = {
    // [API Mapping] GET /api/user/{employeeId} — 직원 상세(이름/이메일/역할)
    getEmployeeDetail: async (employeeId: number): Promise<EmployeeDetail> => {
        const res = await api.get<any>(`/api/user/${employeeId}`);
        const data = res.data?.data ?? res.data;
        return {
            id: data.id,
            name: data.name ?? '직원',
            email: data.email ?? '',
            role: data.userGrade ?? data.role ?? 'EMPLOYEE',
        };
    },

    // [API Mapping] PUT /api/stores/{storeId}/employees/{employeeId}/active?active=<bool>
    toggleActive: async (storeId: number, employeeId: number, active: boolean): Promise<boolean> => {
        const res = await api.put<{ employeeId: number; active: boolean }>(
            `/api/stores/${storeId}/employees/${employeeId}/active`,
            undefined,
            {params: {active}},
        );
        return (res.data as any)?.active ?? active;
    },

    // [API Mapping] GET /api/stores/{storeId}/employees/{employeeId}/memo
    getMemo: async (storeId: number, employeeId: number): Promise<string> => {
        const res = await api.get<{ memo: string }>(`/api/stores/${storeId}/employees/${employeeId}/memo`);
        return res.data?.memo ?? '';
    },

    // [API Mapping] PUT /api/stores/{storeId}/employees/{employeeId}/memo
    updateMemo: async (storeId: number, employeeId: number, memo: string): Promise<void> => {
        await api.put(`/api/stores/${storeId}/employees/${employeeId}/memo`, {memo});
    },
};

export default employeeService;
