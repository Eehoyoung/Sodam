package com.rich.sodam.service;

import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.PasswordResetToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.PasswordResetTokenRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.BearerTokenHasher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailSender emailSender;

    @Test
    void confirmsResetByTicketDigestWithoutPersistingTheRawBearerTicket() {
        BearerTokenHasher hasher = new BearerTokenHasher("test-only-token-hash-key");
        PasswordResetService service = new PasswordResetService(
                userRepository, tokenRepository, passwordEncoder, emailSender, hasher);
        String rawTicket = "opaque-reset-ticket";
        PasswordResetToken token = PasswordResetToken.create("user@sodam.dev", "otp-digest",
                hasher.hash(rawTicket), 5);
        User user = new User();
        user.setId(7L);
        when(tokenRepository.findByResetTicketHashAndUsedFalse(hasher.hash(rawTicket)))
                .thenReturn(Optional.of(token));
        when(userRepository.findByEmail("user@sodam.dev")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("bcrypt-hash");

        assertThat(service.confirmReset(rawTicket, "Valid1!Password")).isTrue();
        assertThat(token.getResetTicketHash()).isEqualTo(hasher.hash(rawTicket))
                .isNotEqualTo(rawTicket);
        verify(tokenRepository).findByResetTicketHashAndUsedFalse(hasher.hash(rawTicket));
    }
}
