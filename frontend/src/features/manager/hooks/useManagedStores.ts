import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import managerService from '../services/managerService';
import type {ManagerPermission} from '../types';

export const managerQueryKeys = {
    managedStores: ['manager', 'managed-stores'] as const,
    storeManagers: (storeId: number) => ['manager', 'stores', storeId, 'managers'] as const,
};

export const useManagedStores = () => useQuery({
    queryKey: managerQueryKeys.managedStores,
    queryFn: managerService.fetchManagedStores,
    staleTime: 30_000,
});

export const useStoreManagers = (storeId: number) => useQuery({
    queryKey: managerQueryKeys.storeManagers(storeId),
    queryFn: () => managerService.fetchManagers(storeId),
    enabled: storeId > 0,
    staleTime: 15_000,
});

export const useAppointManager = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({employeeId, permissions}: {employeeId: number; permissions: ManagerPermission[]}) =>
            managerService.appointManager(storeId, employeeId, permissions),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: managerQueryKeys.storeManagers(storeId)});
        },
    });
};

export const useUpdateManagerPermissions = (storeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({employeeId, permissions}: {employeeId: number; permissions: ManagerPermission[]}) =>
            managerService.updatePermissions(storeId, employeeId, permissions),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: managerQueryKeys.storeManagers(storeId)});
        },
    });
};
