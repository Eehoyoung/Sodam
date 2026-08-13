import {useQuery} from '@tanstack/react-query';
import attendanceCreditApi from '../services/attendanceCreditApi';

export const useAttendanceCreditPaymentReadiness = (enabled = true) => useQuery({
    queryKey: ['attendance-credit', 'payment-readiness'],
    queryFn: () => attendanceCreditApi.getPaymentReadiness(),
    enabled,
});
