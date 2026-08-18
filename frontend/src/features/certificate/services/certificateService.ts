import {downloadAndOpenPdf} from '../../../common/utils/pdfDocument';

/**
 * 증명서 발급 서비스 (직원 본인용).
 *
 * BE 계약:
 *   GET /api/certificates/my?storeId={id}&type=EMPLOYMENT|CAREER → PDF 바이트
 *   - EMPLOYMENT: 재직증명서 / CAREER: 경력증명서
 *
 * 내려받은 PDF 는 common/utils/pdfDocument 가 기기에 저장하고 기본 뷰어로 연다(H-4).
 * 예전에는 바이트를 받아 버리고 텍스트 미리보기만 보여줘서, 직원이 증명서를 실제로
 * 열람·보관할 수 없었다.
 */

export type CertificateType = 'EMPLOYMENT' | 'CAREER';

export const CERTIFICATE_TYPE_LABEL: Record<CertificateType, string> = {
    EMPLOYMENT: '재직증명서',
    CAREER: '경력증명서',
};

// [API Mapping] GET /api/certificates/my — 본인 증명서 PDF 발급 (BOLA: 본인 소속 매장만)
/** 증명서 PDF 를 기기에 저장하고 기본 뷰어로 연다. 저장 경로를 반환(H-4). */
const downloadMyCertificate = async (
    storeId: number,
    type: CertificateType,
    fileName: string,
): Promise<string> =>
    downloadAndOpenPdf({
        path: '/api/certificates/my',
        params: {storeId, type},
        fileName,
    });

const certificateService = {
    downloadMyCertificate,
};

export default certificateService;
