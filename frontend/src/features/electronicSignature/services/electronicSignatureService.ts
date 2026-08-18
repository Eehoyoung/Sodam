import api from '../../../common/api/client';
import {downloadAndOpenPdf} from '../../../common/utils/pdfDocument';
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

    /** 서명 대상 문서 PDF 를 저장하고 기본 뷰어로 연다(H-4). 저장 경로를 반환. */
    async downloadDocument(envelopeId: number) {
        return downloadAndOpenPdf({
            path: `${base(envelopeId)}/document`,
            fileName: `전자서명문서_${envelopeId}.pdf`,
        });
    },

    /** 완료증명서 PDF 를 저장하고 기본 뷰어로 연다(H-4). 저장 경로를 반환. */
    async downloadCompletionCertificate(envelopeId: number) {
        return downloadAndOpenPdf({
            path: `${base(envelopeId)}/completion-certificate`,
            fileName: `완료증명서_${envelopeId}.pdf`,
        });
    },
};

export default electronicSignatureService;
