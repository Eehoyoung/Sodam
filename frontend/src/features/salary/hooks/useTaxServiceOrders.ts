import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import taxServiceOrderApi, {TaxPackageType} from '../services/taxServiceOrderApi';

export const taxServiceOrderQueryKeys = {
    all: ['tax-service-orders'] as const,
    packages: () => [...taxServiceOrderQueryKeys.all, 'packages'] as const,
    mine: () => [...taxServiceOrderQueryKeys.all, 'mine'] as const,
    readiness: () => [...taxServiceOrderQueryKeys.all, 'payment-readiness'] as const,
};

export const useTaxPaymentReadiness = () => useQuery({
    queryKey: taxServiceOrderQueryKeys.readiness(),
    queryFn: () => taxServiceOrderApi.getPaymentReadiness(),
    staleTime: 0,
});

export const useTaxServicePackages = () => useQuery({
    queryKey: taxServiceOrderQueryKeys.packages(),
    queryFn: () => taxServiceOrderApi.getPackages(),
});

export const useMyTaxServiceOrders = () => useQuery({
    queryKey: taxServiceOrderQueryKeys.mine(),
    queryFn: () => taxServiceOrderApi.getMyOrders(),
});

export const useMockTaxServicePurchase = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (packageType: TaxPackageType) => {
            const order = await taxServiceOrderApi.createOrder(packageType);
            return taxServiceOrderApi.confirmOrder(order.orderId, `mock_tax_${order.orderId}`, order.amount);
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: taxServiceOrderQueryKeys.mine()}),
    });
};

export const useCreateTaxServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (packageType: TaxPackageType) => taxServiceOrderApi.createOrder(packageType),
        onSuccess: () => queryClient.invalidateQueries({queryKey: taxServiceOrderQueryKeys.mine()}),
    });
};

export const useConfirmTaxServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({orderId, paymentKey, amount}: {orderId: string; paymentKey: string; amount: number}) =>
            taxServiceOrderApi.confirmOrder(orderId, paymentKey, amount),
        onSuccess: () => queryClient.invalidateQueries({queryKey: taxServiceOrderQueryKeys.mine()}),
    });
};
