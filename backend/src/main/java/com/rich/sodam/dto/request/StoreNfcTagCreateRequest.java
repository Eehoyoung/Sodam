package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * 매장 NFC 태그 등록 요청. 사장이 매장에 부착한 태그를 등록.
 */
@Getter
@Setter
public class StoreNfcTagCreateRequest {

    @NotBlank(message = "태그 식별자를 입력해 주세요.")
    @Size(max = 128, message = "태그 식별자는 128자 이내로 입력해 주세요.")
    private String tagId;

    @Size(max = 100, message = "라벨은 100자 이내로 입력해 주세요.")
    private String label;
}
