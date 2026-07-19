package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 고위험 행위 직전에 현재 계정의 비밀번호를 다시 확인한다. 원문은 저장하거나 로그하지 않는다. */
@Service
@RequiredArgsConstructor
public class StepUpAuthenticationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StepUpAttemptLimiter attemptLimiter;

    @Transactional(readOnly = true)
    public void verifyPassword(Long userId, String rawPassword) {
        attemptLimiter.assertAllowed(userId);
        if (rawPassword == null || rawPassword.isBlank()) {
            attemptLimiter.recordFailure(userId);
            throw new AccessDeniedException("급여 확정 전 비밀번호 재확인이 필요합니다.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
        if (user.getPassword() == null || !passwordEncoder.matches(rawPassword, user.getPassword())) {
            attemptLimiter.recordFailure(userId);
            throw new AccessDeniedException("비밀번호 재확인에 실패했습니다.");
        }
        attemptLimiter.recordSuccess(userId);
    }
}
