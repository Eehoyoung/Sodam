package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StepUpAuthenticationServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final StepUpAttemptLimiter limiter = mock(StepUpAttemptLimiter.class);
    private final StepUpAuthenticationService service = new StepUpAuthenticationService(users, encoder, limiter);

    @Test
    void verifiesWithoutPersistingRawPassword() {
        User user = new User();
        user.setPassword("bcrypt-hash");
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(encoder.matches("raw-password", "bcrypt-hash")).thenReturn(true);

        service.verifyPassword(1L, "raw-password");

        verify(limiter).assertAllowed(1L);
        verify(limiter).recordSuccess(1L);
        verify(encoder).matches("raw-password", "bcrypt-hash");
        verify(users, never()).save(any());
    }

    @Test
    void rejectsMissingOrWrongPassword() {
        assertThatThrownBy(() -> service.verifyPassword(1L, null))
                .isInstanceOf(AccessDeniedException.class);
        verify(limiter).recordFailure(1L);
        clearInvocations(limiter);
        User user = new User();
        user.setPassword("bcrypt-hash");
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "bcrypt-hash")).thenReturn(false);
        assertThatThrownBy(() -> service.verifyPassword(1L, "wrong"))
                .isInstanceOf(AccessDeniedException.class);
        verify(limiter).recordFailure(1L);
    }
}
