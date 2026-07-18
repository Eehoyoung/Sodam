package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Q&A 화면 1:1 문의 작성 요청.
 */
@Getter
@Setter
public class CustomerInquiryCreateRequest {

    @NotBlank(message = "이름을 입력해 주세요.")
    @Size(max = 100, message = "이름은 100자 이내로 입력해 주세요.")
    private String name;

    @NotBlank(message = "이메일을 입력해 주세요.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = 190)
    private String email;

    @NotBlank(message = "문의 내용을 입력해 주세요.")
    @Size(max = 2000, message = "문의 내용은 2000자 이내로 입력해 주세요.")
    private String content;
}
