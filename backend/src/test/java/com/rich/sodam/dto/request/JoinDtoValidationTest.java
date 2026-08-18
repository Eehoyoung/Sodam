package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.UserGrade;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * H-2 — JoinDto 에 제약 애노테이션이 하나도 없어 컨트롤러의 @Valid 가 장식뿐이었다.
 * 잘못된 이메일 형식·약한 비밀번호·미동의 가입이 400 이 아니라 서비스 안쪽까지 들어갔다.
 */
class JoinDtoValidationTest {

    private static final Validator VALIDATOR;

    static {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            VALIDATOR = factory.getValidator();
        }
    }

    private JoinDto valid() {
        JoinDto dto = new JoinDto();
        dto.setEmail("owner@sodam.dev");
        dto.setName("사장님");
        dto.setPassword("Sodam123!");
        dto.setUserGrade(UserGrade.MASTER);
        dto.setAgeConfirmed(true);
        dto.setTermsAgreed(true);
        dto.setPrivacyAgreed(true);
        return dto;
    }

    @Test
    @DisplayName("정상 요청은 위반이 없다")
    void validPasses() {
        assertThat(VALIDATOR.validate(valid())).isEmpty();
    }

    @Test
    @DisplayName("이메일 형식이 잘못되면 검증에 걸린다(400)")
    void invalidEmailRejected() {
        JoinDto dto = valid();
        dto.setEmail("not-an-email");

        assertThat(VALIDATOR.validate(dto))
                .anySatisfy(v -> assertThat(v.getPropertyPath().toString()).isEqualTo("email"));
    }

    @Test
    @DisplayName("이메일/이름이 비면 검증에 걸린다")
    void blankFieldsRejected() {
        JoinDto dto = valid();
        dto.setEmail("  ");
        dto.setName("");

        assertThat(VALIDATOR.validate(dto)).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("비밀번호 정책 미달은 검증에 걸린다 — 재설정과 같은 규칙을 쓴다")
    void weakPasswordRejected() {
        JoinDto dto = valid();
        dto.setPassword("abc");

        assertThat(VALIDATOR.validate(dto))
                .anySatisfy(v -> assertThat(v.getPropertyPath().toString())
                        .isEqualTo("passwordPolicySatisfied"));
    }

    @Test
    @DisplayName("필수 동의 누락은 검증에 걸린다(법적 필수값)")
    void missingConsentRejected() {
        JoinDto dto = valid();
        dto.setPrivacyAgreed(false);

        assertThat(VALIDATOR.validate(dto))
                .anySatisfy(v -> assertThat(v.getPropertyPath().toString())
                        .isEqualTo("requiredConsentsAgreed"));
    }
}
