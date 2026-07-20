import api from '../../../common/api/client';
import type {DelegationAudit, ManagedStore, ManagerPermission, StoreManager} from '../types';

export interface AppointManagerResult {
    envelopeId: number;
    status: string;
}

export interface PermissionUpdateResult {
    signatureRequired: boolean;
    envelopeId: number | null;
    delegationVersion: number;
    permissions: ManagerPermission[];
}

const managerService = {
    async appointManager(storeId: number, employeeId: number, permissions: ManagerPermission[]) {
        const {data} = await api.post<AppointManagerResult>(`/api/stores/${storeId}/managers`, {
            employeeId,
            permissions,
        });
        return data;
    },

    async fetchManagers(storeId: number) {
        const {data} = await api.get<StoreManager[]>(`/api/stores/${storeId}/managers`);
        return data;
    },

    async updatePermissions(storeId: number, employeeId: number, permissions: ManagerPermission[]) {
        const {data} = await api.put<PermissionUpdateResult>(
            `/api/stores/${storeId}/managers/${employeeId}`,
            {permissions},
        );
        return data;
    },

    async fetchManagedStores() {
        const {data} = await api.get<ManagedStore[]>('/api/me/managed-stores');
        return data;
    },

    async revokeManager(storeId: number, employeeId: number, reason?: string) {
        await api.delete<void>(`/api/stores/${storeId}/managers/${employeeId}`, {
            data: reason ? {reason} : undefined,
        });
    },

    async fetchDelegationAudit(storeId: number) {
        const {data} = await api.get<DelegationAudit[]>(`/api/stores/${storeId}/delegation-audit`);
        return data;
    },
};

export default managerService;
