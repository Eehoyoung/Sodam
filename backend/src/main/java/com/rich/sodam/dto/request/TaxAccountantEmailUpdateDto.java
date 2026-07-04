package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 매장 세무사 이메일 등록/수정 요청. null/빈 값이면 등록 해제.
 */
@Getter
@Setter
@NoArgsConstructor
public class TaxAccountantEmailUpdateDto {

    @Email(message = "올바른 이메일 형식이 아니에요.")
    @Size(max = 255)
    private String email;
}
