import {useQuery} from '@tanstack/react-query';
import recruitmentBoostPassApi from '../services/recruitmentBoostPassApi';

export const useRecruitmentBoostPassPaymentReadiness = (enabled = true) => useQuery({
    queryKey: ['recruitment-boost-pass', 'payment-readiness'],
    queryFn: () => recruitmentBoostPassApi.getPaymentReadiness(),
    enabled,
    staleTime: 30_000,
});
