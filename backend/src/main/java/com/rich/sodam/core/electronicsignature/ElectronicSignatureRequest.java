package com.rich.sodam.core.electronicsignature;

import java.net.URI;
import java.net.URISyntaxException;

/** 공급자 중립 단건 PDF 전자서명 요청. */
public record ElectronicSignatureRequest(
        ElectronicSignatureProvider provider,
        SignerIdentity signer,
        DocumentDigest documentDigest,
        String title,
        String message,
        String callCenterNumber,
        int expiresInSeconds,
        boolean appToApp,
        DeviceOs deviceOs,
        String returnUrl) {

    public ElectronicSignatureRequest {
        if (provider == null || signer == null || documentDigest == null) {
            throw new IllegalArgumentException("공급자·서명자·문서 해시는 필수입니다.");
        }
        title = normalizeRequired(title, 40, "서명 요청 제목");
        message = normalizeOptional(message, 500, "서명 요청 메시지");
        callCenterNumber = normalizeOptional(callCenterNumber, 12, "고객센터 연락처");
        if (callCenterNumber != null && !callCenterNumber.matches("[0-9-]{3,12}")) {
            throw new IllegalArgumentException("고객센터 연락처가 올바르지 않습니다.");
        }

        ElectronicSignatureProviderPolicy policy = provider.policy();
        if (expiresInSeconds < 1 || expiresInSeconds > policy.maxExpirySeconds()) {
            throw new IllegalArgumentException("전자서명 만료시간이 공급자 허용 범위를 벗어났습니다.");
        }
        if (policy.messageRequired() && message == null) {
            throw new IllegalArgumentException("이 공급자는 서명 요청 메시지가 필수입니다.");
        }
        if (!policy.messageSupported() && message != null) {
            throw new IllegalArgumentException("이 공급자는 별도 서명 요청 메시지를 지원하지 않습니다.");
        }
        if (policy.callCenterRequired() && callCenterNumber == null) {
            throw new IllegalArgumentException("이 공급자는 고객센터 연락처가 필수입니다.");
        }
        if (appToApp) {
            validateAppToAppReturnUrl(returnUrl);
            if (policy.deviceOsRequiredForAppToApp() && deviceOs == null) {
                throw new IllegalArgumentException("앱투앱 서명에는 장치 운영체제가 필요합니다.");
            }
        } else if (returnUrl != null && !returnUrl.isBlank()) {
            throw new IllegalArgumentException("푸시 서명에는 복귀 URL을 지정할 수 없습니다.");
        }
    }

    private static String normalizeRequired(String value, int max, String field) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty() || normalized.length() > max) {
            throw new IllegalArgumentException(field + "이(가) 올바르지 않습니다.");
        }
        return normalized;
    }

    private static String normalizeOptional(String value, int max, String field) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > max) {
            throw new IllegalArgumentException(field + "이(가) 너무 깁니다.");
        }
        return normalized;
    }

    private static void validateAppToAppReturnUrl(String returnUrl) {
        if (returnUrl == null || returnUrl.isBlank() || returnUrl.length() > 1000) {
            throw new IllegalArgumentException("앱투앱 복귀 앱 스킴이 필요합니다.");
        }
        try {
            URI uri = new URI(returnUrl);
            String scheme = uri.getScheme();
            if (scheme == null || scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https")) {
                throw new IllegalArgumentException("복귀 URL은 안전한 앱 스킴이어야 합니다.");
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("복귀 앱 스킴 형식이 올바르지 않습니다.");
        }
    }
}
