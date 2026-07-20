import api from '../../../common/api/client';
import type {ElectronicSignatureEnvelope} from '../types';

const base = (envelopeId: number) => `/api/e-sign/envelopes/${envelopeId}`;

const electronicSignatureService = {
    async getEnvelope(envelopeId: number) {
        const {data} = await api.get<ElectronicSignatureEnvelope>(base(envelopeId));
        return data;
    },

    async requestSignature(envelopeId: number) {
        await api.post<void>(`${base(envelopeId)}/signing-request`);
    },

    async refresh(envelopeId: number) {
        await api.post<void>(`${base(envelopeId)}/refresh`);
    },

    async downloadDocument(envelopeId: number) {
        const {data} = await api.get<ArrayBuffer>(`${base(envelopeId)}/document`, undefined, {
            responseType: 'arraybuffer',
        });
        return data;
    },

    async downloadCompletionCertificate(envelopeId: number) {
        const {data} = await api.get<ArrayBuffer>(`${base(envelopeId)}/completion-certificate`, undefined, {
            responseType: 'arraybuffer',
        });
        return data;
    },
};

export default electronicSignatureService;
