/**
 * 서명 캡처 유틸 — react-native-signature-canvas 가 있으면 노출하고,
 * 없으면 null 을 반환해 호출부가 "동의 확인" 경로로 안전하게 폴백한다.
 *
 * 라이브러리를 하드 의존하지 않으므로(미설치 환경에서도 tsc/빌드 통과),
 * 어느 경로든 POST /sign 으로 서명 시각(employeeSignedAt)을 기록한다.
 */
import type {ComponentType} from 'react';

/** react-native-signature-canvas 의 핵심 props 부분 타입(우리가 쓰는 것만). */
export interface SignatureCanvasProps {
    onOK?: (signature: string) => void;
    onEmpty?: () => void;
    descriptionText?: string;
    clearText?: string;
    confirmText?: string;
    webStyle?: string;
    autoClear?: boolean;
    style?: unknown;
}

/**
 * 서명 캔버스 컴포넌트를 동적으로 로드한다.
 * @returns 컴포넌트 / 미설치 시 null (호출부는 동의 확인 버튼으로 폴백)
 */
export function loadSignatureCanvas(): ComponentType<SignatureCanvasProps> | null {
    try {
        // 동적 로드 — 미설치 시 require 가 throw → null 폴백.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('react-native-signature-canvas');
        const Comp = (mod?.default ?? mod) as ComponentType<SignatureCanvasProps> | undefined;
        return typeof Comp === 'function' ? Comp : null;
    } catch {
        return null;
    }
}
