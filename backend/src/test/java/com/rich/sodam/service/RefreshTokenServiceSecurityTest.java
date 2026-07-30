package com.rich.sodam.service;

import com.rich.sodam.domain.RefreshToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.RefreshTokenRepository;
import com.rich.sodam.security.BearerTokenHasher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceSecurityTest {

    @Mock private RefreshTokenRepository repository;

    @Test
    void persistsOnlyHmacDigestAndLooksUpByDigest() {
        BearerTokenHasher hasher = new BearerTokenHasher("test-only-token-hash-key");
        RefreshTokenService service = new RefreshTokenService(repository, hasher);
        ReflectionTestUtils.setField(service, "refreshTokenValidityInDays", 7);
        User user = new User();
        user.setId(7L);
        when(repository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken issued = service.createRefreshToken(user);

        assertThat(issued.getToken()).isNotBlank();
        assertThat(issued.getTokenHash()).isEqualTo(hasher.hash(issued.getToken()))
                .isNotEqualTo(issued.getToken());

        service.findByToken(issued.getToken());
        verify(repository).findByTokenHash(hasher.hash(issued.getToken()));
    }
}
