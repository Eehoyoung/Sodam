import ReactNativeBlobUtil from 'react-native-blob-util';
import TokenManager from '../../src/common/auth/tokenStore';
import {downloadPdf, downloadAndOpenPdf, openPdf} from '../../src/common/utils/pdfDocument';

// [Test Mapping] H-4 — 증명서·근로계약서·급여명세서·전자서명 문서가 PDF 바이트를 받아 버리고
// 텍스트 미리보기만 보여주던 문제. 이제 실제로 파일로 저장하고 기본 뷰어로 연다.

const fetchMock = () => (globalThis as any).__blobUtilFetch as jest.Mock;

describe('pdfDocument', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await TokenManager.clear();
        fetchMock().mockResolvedValue({
            info: () => ({status: 200}),
            path: () => '/mock/documents/재직증명서.pdf',
        });
    });

    it('쿼리 파라미터를 URL 에 싣고 Authorization 헤더를 붙인다', async () => {
        await TokenManager.setTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});

        const path = await downloadPdf({
            path: '/api/certificates/my',
            params: {storeId: 10, type: 'EMPLOYMENT'},
            fileName: '재직증명서.pdf',
        });

        expect(path).toBe('/mock/documents/재직증명서.pdf');
        const [method, url, headers] = fetchMock().mock.calls[0];
        expect(method).toBe('GET');
        expect(url).toContain('/api/certificates/my?storeId=10&type=EMPLOYMENT');
        expect(headers.Authorization).toBe('Bearer access-1');
    });

    it('파일명에 경로 구분자가 들어가도 안전하게 치환한다', async () => {
        await downloadPdf({path: '/api/x', fileName: '근로계약서 2026/08 홍길동'});

        const configArg = (ReactNativeBlobUtil.config as jest.Mock).mock.calls[0][0];
        expect(configArg.path).toBe('/mock/documents/근로계약서 2026_08 홍길동.pdf');
    });

    it('서버가 실패 상태를 주면 조용히 성공한 척하지 않는다', async () => {
        fetchMock().mockResolvedValue({info: () => ({status: 500}), path: () => ''});

        await expect(downloadPdf({path: '/api/x', fileName: 'a.pdf'}))
            .rejects.toThrow('PDF_DOWNLOAD_FAILED_500');
    });

    it('내려받은 뒤 기기 기본 뷰어로 연다', async () => {
        await downloadAndOpenPdf({path: '/api/x', fileName: 'a.pdf'});

        // 테스트 환경 Platform.OS 는 ios — 두 경로 중 하나는 반드시 불려야 한다.
        const opened =
            (ReactNativeBlobUtil.ios.openDocument as jest.Mock).mock.calls.length +
            (ReactNativeBlobUtil.android.actionViewIntent as jest.Mock).mock.calls.length;
        expect(opened).toBe(1);
    });

    it('openPdf 는 저장 경로를 그대로 뷰어에 넘긴다', async () => {
        await openPdf('/mock/documents/a.pdf');

        const iosCalls = (ReactNativeBlobUtil.ios.openDocument as jest.Mock).mock.calls;
        const androidCalls = (ReactNativeBlobUtil.android.actionViewIntent as jest.Mock).mock.calls;
        const arg = (iosCalls[0] ?? androidCalls[0])[0];
        expect(arg).toBe('/mock/documents/a.pdf');
    });
});
