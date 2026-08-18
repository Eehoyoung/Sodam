import {Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import TokenManager from '../auth/tokenStore';
import {refresh as refreshAccessToken} from '../auth/sessionCoordinator';
import {env} from '../config/env';
import {logger} from '../../utils/logger';

/**
 * 법적 문서(근로계약서·증명서·급여명세서·전자서명 문서) PDF 내려받기·열기 공용 경로 — H-4.
 *
 * 이전에는 화면들이 PDF 바이트를 받아 그대로 버리고 텍스트 미리보기만 보여줬다. 직원이 자기
 * 근로계약서·급여명세서를 실제로 열람·보관할 수 없는 상태였다(§48② 교부 의무와 직결).
 *
 * axios 대신 blob-util 의 fetch 를 쓰는 이유: RN 의 XHR 은 바이너리 응답을 안정적으로 다루지
 * 못한다. blob-util 은 응답을 곧장 파일로 떨어뜨려 저장·열기·공유를 한 번에 해결한다.
 * 대신 axios 인터셉터를 타지 않으므로 401 재발급을 여기서 한 번 직접 처리한다.
 */

export interface PdfRequest {
    /** `/api/certificates/my` 처럼 baseURL 을 제외한 경로. */
    path: string;
    /** 쿼리 파라미터(선택). */
    params?: Record<string, string | number | boolean | undefined | null>;
    /** 저장될 파일명. `.pdf` 가 없으면 붙는다. */
    fileName: string;
}

const withPdfExtension = (name: string): string =>
    name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;

/** 파일 시스템에서 문제를 일으키는 문자를 없앤다(매장명·직원명이 파일명에 들어간다). */
const sanitizeFileName = (name: string): string =>
    withPdfExtension(name).replace(/[\\/:*?"<>|]/g, '_');

const buildUrl = (path: string, params?: PdfRequest['params']): string => {
    const base = env.apiBaseUrl.replace(/\/+$/, '');
    const query = Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
    return `${base}${path}${query ? `?${query}` : ''}`;
};

const fetchOnce = async (url: string, fileName: string, accessToken: string | null) =>
    ReactNativeBlobUtil.config({
        fileCache: true,
        appendExt: 'pdf',
        path: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`,
    }).fetch('GET', url, {
        Accept: 'application/pdf',
        ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
    });

/**
 * PDF 를 내려받아 기기에 저장하고 파일 경로를 돌려준다.
 *
 * @throws Error 서버가 2xx 를 주지 않았을 때 — 실패를 성공처럼 보이게 하지 않는다.
 */
export async function downloadPdf({path, params, fileName}: PdfRequest): Promise<string> {
    const url = buildUrl(path, params);
    const safeName = sanitizeFileName(fileName);

    let response = await fetchOnce(url, safeName, await TokenManager.getAccess());

    // 만료 토큰(401)은 한 번만 재발급 후 재시도한다 — axios 인터셉터를 안 타는 경로이기 때문.
    if (response.info().status === 401) {
        await refreshAccessToken();
        response = await fetchOnce(url, safeName, await TokenManager.getAccess());
    }

    const status = response.info().status;
    if (status < 200 || status >= 300) {
        logger.error('[PDF] 다운로드 실패', {path, status});
        throw new Error(`PDF_DOWNLOAD_FAILED_${status}`);
    }
    return response.path();
}

/** 저장된 PDF 를 기기 기본 뷰어로 연다. */
export async function openPdf(filePath: string): Promise<void> {
    if (Platform.OS === 'android') {
        await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/pdf');
        return;
    }
    await ReactNativeBlobUtil.ios.openDocument(filePath);
}

/** 내려받아 곧바로 열기 — 화면들이 쓰는 기본 경로. */
export async function downloadAndOpenPdf(request: PdfRequest): Promise<string> {
    const filePath = await downloadPdf(request);
    await openPdf(filePath);
    return filePath;
}
