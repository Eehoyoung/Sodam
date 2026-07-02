package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.UserGrade;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
public class JoinDto {

    private Long id;

    private String email;

    private String password;

    private String name;

    private UserGrade userGrade;

    /** 만 14세 이상 확인 (필수) — false 시 가입 거부 */
    private Boolean ageConfirmed;

    /** 이용약관 동의 (필수) */
    private Boolean termsAgreed;

    /** 개인정보처리방침 동의 (필수) */
    private Boolean privacyAgreed;

    /** 마케팅 정보 수신 동의 (선택, null/false 모두 비동의) */
    private Boolean marketingAgreed;
}
