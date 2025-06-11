package com.rich.sodam.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;

@Service
public class RedisService {

    private final RedisTemplate<String, Object> jwtRedisTemplate;

    public RedisService(@Qualifier("jwtRedisTemplate") RedisTemplate<String, Object> jwtRedisTemplate) {
        this.jwtRedisTemplate = jwtRedisTemplate;
    }


    /**
     * SHA-256 알고리즘을 사용하여 토큰의 해시값을 계산합니다.
     *
     * @param token 원본 토큰 문자열
     * @return Base64 인코딩된 해시값
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("토큰 해싱 중 에러 발생", e);
        }
    }

    /**
     * 사용자 토큰을 Redis 해시 구조에 저장합니다.
     *
     * @param userId            사용자 식별자
     * @param token             원본 토큰 문자열
     * @param expirationSeconds 토큰의 만료 기간 (초)
     */
    public void saveToken(Long userId, String token, long expirationSeconds) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        // 해시의 필드(키): tokenHash, 값: 원본 토큰 또는 추가 메타정보(JSON 등)
        jwtRedisTemplate.opsForHash().put(key, tokenHash, token);
        // 해당 키의 TTL을 토큰의 만료 시간으로 설정
        jwtRedisTemplate.expire(key, Duration.ofSeconds(expirationSeconds));
    }

    /**
     * 저장된 토큰 해시를 조회하여 토큰이 유효한지 확인합니다.
     *
     * @param userId 사용자 식별자
     * @param token  클라이언트에서 전달된 원본 토큰 문자열
     * @return 저장된 해시와 일치하면 true, 그렇지 않으면 false
     */
    public boolean verifyToken(String userId, String token) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        Object storedToken = jwtRedisTemplate.opsForHash().get(key, tokenHash);
        return storedToken != null;
    }

    /**
     * Redis에 저장된 특정 토큰을 삭제합니다.
     *
     * @param userId 사용자 식별자
     * @param token  삭제할 원본 토큰 문자열
     */
    public void deleteToken(String userId, String token) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        jwtRedisTemplate.opsForHash().delete(key, tokenHash);
    }
}
