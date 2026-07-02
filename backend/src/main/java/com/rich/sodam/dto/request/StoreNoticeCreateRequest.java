package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * 매장 공지 작성 요청 (M-NEW-04). 사장이 제목·내용으로 발행.
 */
@Getter
@Setter
public class StoreNoticeCreateRequest {

    @NotBlank(message = "공지 제목을 입력해 주세요.")
    @Size(max = 100, message = "제목은 100자 이내로 입력해 주세요.")
    private String title;

    @NotBlank(message = "공지 내용을 입력해 주세요.")
    @Size(max = 2000, message = "내용은 2000자 이내로 입력해 주세요.")
    private String body;
}
