package com.rich.sodam.repository;

import com.rich.sodam.domain.RefreshToken;
import com.rich.sodam.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * RefreshToken 엔티티에 대한 데이터 액세스 레이어
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * 토큰 값으로 리프레시 토큰을 조회합니다.
     *
     * @param token 토큰 값
     * @return 리프레시 토큰
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * 사용자별 유효한 리프레시 토큰을 조회합니다.
     *
     * @param user 사용자
     * @return 유효한 리프레시 토큰 목록
     */
    @Query("SELECT rt FROM RefreshToken rt WHERE rt.user = :user AND rt.used = false AND rt.expiryDate > :now")
    List<RefreshToken> findValidTokensByUser(@Param("user") User user, @Param("now") LocalDateTime now);

    /**
     * 사용자의 모든 리프레시 토큰을 조회합니다.
     *
     * @param user 사용자
     * @return 리프레시 토큰 목록
     */
    List<RefreshToken> findByUser(User user);

    /**
     * 만료된 토큰들을 삭제합니다.
     *
     * @param now 현재 시간
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiryDate < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);

    /**
     * 사용자의 모든 토큰을 사용 처리합니다.
     *
     * @param user 사용자
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.used = true WHERE rt.user = :user")
    void markAllTokensAsUsedByUser(@Param("user") User user);

    /**
     * 사용자의 모든 토큰을 삭제합니다.
     *
     * @param user 사용자
     */
    void deleteByUser(User user);
}
