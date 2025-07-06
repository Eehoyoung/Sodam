package com.rich.sodam.service;

import com.rich.sodam.domain.RefreshToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 리프레시 토큰 관리 서비스
 * 리프레시 토큰의 생성, 검증, 갱신, 삭제 등을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token-validity-in-days:7}")
    private int refreshTokenValidityInDays;

    /**
     * 새로운 리프레시 토큰을 생성합니다.
     *
     * @param user 사용자
     * @return 생성된 리프레시 토큰
     */
    public RefreshToken createRefreshToken(User user) {
        // 기존 유효한 토큰들을 무효화
        invalidateUserTokens(user);

        // 새 토큰 생성
        String tokenValue = generateTokenValue();
        LocalDateTime expiryDate = LocalDateTime.now().plusDays(refreshTokenValidityInDays);

        RefreshToken refreshToken = new RefreshToken(tokenValue, user, expiryDate);
        RefreshToken savedToken = refreshTokenRepository.save(refreshToken);

        log.debug("새로운 리프레시 토큰 생성 - 사용자 ID: {}, 만료일: {}", user.getId(), expiryDate);
        return savedToken;
    }

    /**
     * 토큰 값으로 리프레시 토큰을 조회합니다.
     *
     * @param token 토큰 값
     * @return 리프레시 토큰
     */
    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    /**
     * 리프레시 토큰의 유효성을 검증합니다.
     *
     * @param refreshToken 리프레시 토큰
     * @return 유효성 여부
     */
    @Transactional(readOnly = true)
    public boolean validateRefreshToken(RefreshToken refreshToken) {
        if (refreshToken == null) {
            return false;
        }

        boolean isValid = refreshToken.isValid();
        if (!isValid) {
            log.debug("유효하지 않은 리프레시 토큰 - ID: {}, 사용됨: {}, 만료됨: {}",
                    refreshToken.getId(), refreshToken.isUsed(), refreshToken.isExpired());
        }

        return isValid;
    }

    /**
     * 리프레시 토큰을 사용 처리합니다.
     *
     * @param refreshToken 리프레시 토큰
     */
    public void markTokenAsUsed(RefreshToken refreshToken) {
        refreshToken.markAsUsed();
        refreshTokenRepository.save(refreshToken);
        log.debug("리프레시 토큰 사용 처리 - ID: {}", refreshToken.getId());
    }

    /**
     * 사용자의 모든 토큰을 무효화합니다.
     *
     * @param user 사용자
     */
    public void invalidateUserTokens(User user) {
        refreshTokenRepository.markAllTokensAsUsedByUser(user);
        log.debug("사용자의 모든 토큰 무효화 - 사용자 ID: {}", user.getId());
    }

    /**
     * 사용자의 모든 토큰을 삭제합니다.
     *
     * @param user 사용자
     */
    public void deleteUserTokens(User user) {
        refreshTokenRepository.deleteByUser(user);
        log.debug("사용자의 모든 토큰 삭제 - 사용자 ID: {}", user.getId());
    }

    /**
     * 만료된 토큰들을 정리합니다.
     * 매일 자정에 실행됩니다.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    public void cleanupExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        refreshTokenRepository.deleteExpiredTokens(now);
        log.info("만료된 리프레시 토큰 정리 완료 - 기준 시간: {}", now);
    }

    /**
     * 사용자의 유효한 토큰 목록을 조회합니다.
     *
     * @param user 사용자
     * @return 유효한 토큰 목록
     */
    @Transactional(readOnly = true)
    public List<RefreshToken> getValidTokensByUser(User user) {
        return refreshTokenRepository.findValidTokensByUser(user, LocalDateTime.now());
    }

    /**
     * 고유한 토큰 값을 생성합니다.
     *
     * @return 토큰 값
     */
    private String generateTokenValue() {
        return UUID.randomUUID().toString().replace("-", "") +
                System.currentTimeMillis() +
                UUID.randomUUID().toString().replace("-", "");
    }
}
