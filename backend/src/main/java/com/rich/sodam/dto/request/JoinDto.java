package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.service.PasswordResetService;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 190, message = "이메일이 너무 깁니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;

    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50, message = "이름이 너무 깁니다.")
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

    /** 위치정보 수집·이용 동의 (GPS 출퇴근 사용을 위해 가입 시점에 함께 수집, FE는 필수로 게이팅) */
    private Boolean locationInfoAgreed;

    /**
     * 비밀번호 정책(8자 이상, 대문자·소문자·숫자·특수문자 중 3종 이상)은
     * {@link PasswordResetService#isValidPassword(String)} 한 곳에만 두고 여기서 재사용한다 —
     * 재설정과 가입이 서로 다른 규칙을 갖게 되는 것을 막는다.
     */
    @AssertTrue(message = "비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자 중 3가지 이상을 포함해야 해요.")
    public boolean isPasswordPolicySatisfied() {
        return password == null || PasswordResetService.isValidPassword(password);
    }

    /** 이용약관·개인정보처리방침·만 14세 이상은 법적 필수 동의다. */
    @AssertTrue(message = "이용약관·개인정보 처리방침·만 14세 이상 동의는 필수입니다.")
    public boolean isRequiredConsentsAgreed() {
        return Boolean.TRUE.equals(ageConfirmed)
                && Boolean.TRUE.equals(termsAgreed)
                && Boolean.TRUE.equals(privacyAgreed);
    }
}
