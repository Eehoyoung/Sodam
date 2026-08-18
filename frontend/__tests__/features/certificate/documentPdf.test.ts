import ReactNativeBlobUtil from 'react-native-blob-util';
import certificateService from '../../../src/features/certificate/services/certificateService';
import contractService from '../../../src/features/contract/services/contractService';
import electronicSignatureService from '../../../src/features/electronicSignature/services/electronicSignatureService';

// [Test Mapping] H-4 — 5개 화면이 공유하는 문서 다운로드 서비스가 실제로 파일을 저장하고
// 뷰어를 여는지 확인한다. 예전에는 PDF 바이트를 받아 버려서 문서를 볼 방법이 없었다.

const fetchMock = () => (globalThis as any).__blobUtilFetch as jest.Mock;

const openedCount = () =>
    (ReactNativeBlobUtil.ios.openDocument as jest.Mock).mock.calls.length +
    (ReactNativeBlobUtil.android.actionViewIntent as jest.Mock).mock.calls.length;

describe('법적 문서 PDF 다운로드 계약', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchMock().mockResolvedValue({
            info: () => ({status: 200}),
            path: () => '/mock/documents/doc.pdf',
        });
    });

    it('증명서: /api/certificates/my 를 쿼리와 함께 받아 저장·열기한다', async () => {
        const path = await certificateService.downloadMyCertificate(10, 'EMPLOYMENT', '재직증명서.pdf');

        expect(path).toBe('/mock/documents/doc.pdf');
        expect(fetchMock().mock.calls[0][1]).toContain('/api/certificates/my?storeId=10&type=EMPLOYMENT');
        expect(openedCount()).toBe(1);
    });

    it('직원 근로계약서: /api/labor-contracts/{id}/pdf', async () => {
        await contractService.downloadMyPdf(7, '근로계약서.pdf');

        expect(fetchMock().mock.calls[0][1]).toContain('/api/labor-contracts/7/pdf');
        expect(openedCount()).toBe(1);
    });

    it('사장 근로계약서: 매장 스코프 경로를 쓴다(BOLA 경계 유지)', async () => {
        await contractService.downloadPdfForMaster(10, 7, '근로계약서.pdf');

        expect(fetchMock().mock.calls[0][1]).toContain('/api/stores/10/labor-contracts/7/pdf');
    });

    it('전자서명 문서/완료증명서도 같은 저장·열기 경로를 쓴다', async () => {
        await electronicSignatureService.downloadDocument(3);
        expect(fetchMock().mock.calls[0][1]).toContain('/api/e-sign/envelopes/3/document');

        jest.clearAllMocks();
        fetchMock().mockResolvedValue({info: () => ({status: 200}), path: () => '/mock/documents/cert.pdf'});
        await electronicSignatureService.downloadCompletionCertificate(3);
        expect(fetchMock().mock.calls[0][1]).toContain('/api/e-sign/envelopes/3/completion-certificate');
        expect(openedCount()).toBe(1);
    });

    it('다운로드 실패는 성공처럼 처리되지 않는다', async () => {
        fetchMock().mockResolvedValue({info: () => ({status: 404}), path: () => ''});

        await expect(certificateService.downloadMyCertificate(10, 'CAREER', '경력증명서.pdf'))
            .rejects.toThrow(/PDF_DOWNLOAD_FAILED/);
        expect(openedCount()).toBe(0);
    });
});
