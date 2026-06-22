/**
 * 영수증 이미지 선택 유틸 — react-native-image-picker 가 있으면 사용하고,
 * 없으면 null 을 반환해 호출부가 "직접 입력" 경로로 안전하게 폴백한다.
 *
 * 라이브러리를 하드 의존하지 않으므로(미설치 환경에서도 빌드/타입 통과),
 * OCR 공급자 계약 전까지 외부 비용 없이 매입장부가 동작한다.
 */

export interface PickedImage {
    uri: string;
    fileName?: string;
    type?: string;
}

type LaunchResult = {
    didCancel?: boolean;
    errorCode?: string;
    assets?: Array<{uri?: string; fileName?: string; type?: string}>;
};

type ImagePickerModule = {
    launchCamera: (opts: Record<string, unknown>) => Promise<LaunchResult>;
    launchImageLibrary: (opts: Record<string, unknown>) => Promise<LaunchResult>;
};

function loadModule(): ImagePickerModule | null {
    try {
        // 동적 로드 — 미설치 시 require 가 throw → null 폴백.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('react-native-image-picker') as Partial<ImagePickerModule>;
        if (mod && typeof mod.launchCamera === 'function' && typeof mod.launchImageLibrary === 'function') {
            return mod as ImagePickerModule;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * 카메라/앨범에서 영수증 1장을 고른다.
 * @returns 선택 이미지 / 취소·미설치 시 null
 */
export async function pickReceiptImage(source: 'camera' | 'album'): Promise<PickedImage | null> {
    const mod = loadModule();
    if (!mod) {
        return null;
    }
    const opts = {mediaType: 'photo', quality: 0.8, selectionLimit: 1} as const;
    const res =
        source === 'camera' ? await mod.launchCamera(opts) : await mod.launchImageLibrary(opts);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- two distinct boolean conditions (cancel OR error), not value coalescing
    if (res.didCancel || res.errorCode) {
        return null;
    }
    const asset = res.assets?.[0];
    if (!asset?.uri) {
        return null;
    }
    return {uri: asset.uri, fileName: asset.fileName, type: asset.type};
}
