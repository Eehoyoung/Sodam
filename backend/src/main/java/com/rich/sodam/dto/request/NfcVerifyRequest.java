package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * NFC 사전 검증(Verify) 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class NfcVerifyRequest {

    /**
     * 매장 ID (선택 사항: 정책에 따라 확장 가능)
     */
    private Long storeId;

    /**
     * NFC 태그 식별자
     */
    @NotBlank(message = "NFC 태그 ID는 필수입니다.")
    private String tagId;
}
