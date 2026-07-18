package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SignerIdentityTest {

    @Test
    void normalizesIdentityAndMatchesProviderResult() {
        SignerIdentity expected = new SignerIdentity(" 홍 길동 ", "010-1234-5678", "1990.01.02");
        VerifiedSignerIdentity actual = new VerifiedSignerIdentity("홍길동", "01012345678", "19900102");

        assertThat(expected.name()).isEqualTo("홍길동");
        assertThat(expected.birthday()).isEqualTo("19900102");
        assertThat(expected.matches(actual)).isTrue();
    }

    @Test
    void rejectsInvalidBirthdayAndPhone() {
        assertThatThrownBy(() -> new SignerIdentity("홍길동", "01012", "19900102"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SignerIdentity("홍길동", "01012345678", "19901340"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsLettersHiddenInsidePhoneAndBirthday() {
        assertThatThrownBy(() -> new SignerIdentity("홍길동", "abc01012345678", "19900102"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SignerIdentity("홍길동", "01012345678", "1990x01x02"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
