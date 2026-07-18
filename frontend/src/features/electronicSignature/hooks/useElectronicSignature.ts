import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import electronicSignatureService from '../services/electronicSignatureService';
import {ENVELOPE_TERMINAL_STATUSES} from '../types';

export const electronicSignatureQueryKey = (envelopeId: number) =>
    ['electronic-signature', 'envelope', envelopeId] as const;

export const useElectronicSignature = (envelopeId: number) => useQuery({
    queryKey: electronicSignatureQueryKey(envelopeId),
    queryFn: () => electronicSignatureService.getEnvelope(envelopeId),
    enabled: envelopeId > 0,
    staleTime: 1_000,
    refetchInterval: query => {
        const envelope = query.state.data;
        if (!envelope || ENVELOPE_TERMINAL_STATUSES.includes(envelope.status)) {
            return false;
        }
        const current = envelope.parties.find(p => p.order === envelope.currentSigningOrder);
        if (current?.status === 'PROVIDER_COMPLETED' || current?.status === 'VERIFY_QUEUED' || current?.status === 'VERIFYING') {
            return 2_000;
        }
        return current?.status === 'PENDING' ? 5_000 : 10_000;
    },
});

export const useRequestElectronicSignature = (envelopeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => electronicSignatureService.requestSignature(envelopeId),
        onSuccess: () => queryClient.invalidateQueries({queryKey: electronicSignatureQueryKey(envelopeId)}),
    });
};

export const useRefreshElectronicSignature = (envelopeId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => electronicSignatureService.refresh(envelopeId),
        onSuccess: () => queryClient.invalidateQueries({queryKey: electronicSignatureQueryKey(envelopeId)}),
    });
};
