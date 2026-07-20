import api from '../../../common/api/client';

/**
 * 증명서 발급 서비스 (직원 본인용).
 *
 * BE 계약:
 *   GET /api/certificates/my?storeId={id}&type=EMPLOYMENT|CAREER → PDF 바이트
 *   - EMPLOYMENT: 재직증명서 / CAREER: 경력증명서
 *
 * 이 프로젝트에는 네이티브 파일 저장 라이브러리(RNFS 등)가 없다.
 * 급여명세서(SalaryDetailScreen → PdfPreview) 패턴과 동일하게,
 * axios(api 래퍼)의 responseType: 'arraybuffer' 로 PDF 바이트를 수신하고
 * 후처리(미리보기/공유)는 호출 측 화면이 PdfPreview 라우트 + Share 로 처리한다.
 *
 * ⚠️ api.get 은 (url, params, config) 시그니처 — params 를 {params:{...}} 로
 * 이중 래핑하면 쿼리가 전송되지 않는다(api-get-param-double-wrap).
 */

export type CertificateType = 'EMPLOYMENT' | 'CAREER';

export const CERTIFICATE_TYPE_LABEL: Record<CertificateType, string> = {
    EMPLOYMENT: '재직증명서',
    CAREER: '경력증명서',
};

// [API Mapping] GET /api/certificates/my — 본인 증명서 PDF 발급 (BOLA: 본인 소속 매장만)
const downloadMyCertificate = async (
    storeId: number,
    type: CertificateType,
): Promise<ArrayBuffer> => {
    const res = await api.get<ArrayBuffer>(
        '/api/certificates/my',
        {storeId, type},
        {responseType: 'arraybuffer'},
    );
    return res.data;
};

const certificateService = {
    downloadMyCertificate,
};

export default certificateService;
