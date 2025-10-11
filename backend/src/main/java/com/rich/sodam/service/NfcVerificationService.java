package com.rich.sodam.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * NFC 태그 검증 서비스 (스텁 구현)
 * 정책 확정 전까지 기본 형식 및 길이 검증을 수행합니다.
 */
@Service
@RequiredArgsConstructor
public class NfcVerificationService {

    /**
     * 태그 유효성 검증
     * - 형식: "SODAM-" 접두사
     * - 최소 길이: 10자
     *
     * @param storeId 매장 ID (정책 확정 시 사용 가능)
     * @param tagId   태그 식별자
     * @return { success, reason }
     */
    public com.rich.sodam.service.model.NfcVerifyResult verifyTag(Long storeId, String tagId) {
        if (tagId == null || tagId.isBlank()) {
            return new com.rich.sodam.service.model.NfcVerifyResult(false, "INVALID_TAG");
        }
        if (!tagId.startsWith("SODAM-")) {
            return new com.rich.sodam.service.model.NfcVerifyResult(false, "INVALID_TAG");
        }
        if (tagId.length() < 10) {
            return new com.rich.sodam.service.model.NfcVerifyResult(false, "INVALID_TAG");
        }
        // TODO: 정책 확정 시 매장별 등록/만료/블랙리스트 확인 로직 추가
        return new com.rich.sodam.service.model.NfcVerifyResult(true, null);
    }
}
