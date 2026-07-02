package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 목적 선택 요청 DTO
 * Kakao 최초 가입자의 목적(personal/employee/boss) 설정에 사용됩니다.
 */
@Getter
@Setter
@NoArgsConstructor
public class PurposeRequest {

    @NotBlank(message = "purpose는 필수 값입니다.")
    private String purpose; // personal | employee | boss
}
