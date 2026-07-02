package com.rich.sodam.service;

/**
 * JWT 토큰 저장소 추상화.
 * 운영(prod/local): Redis 백엔드 ({@link RedisService}).
 * 개발/에뮬레이터(dev): In-memory 백엔드 ({@link InMemoryTokenStore}).
 */
public interface TokenStore {

    /** SHA-256 토큰 해시. 동일 인터페이스로 외부에서 검증 가능. */
    String hashToken(String token);

    /** 사용자 토큰 저장 (TTL 초). */
    void saveToken(Long userId, String token, long expirationSeconds);

    /** 저장된 토큰 검증. */
    boolean verifyToken(String userId, String token);

    /** 특정 토큰 삭제 (로그아웃 등). */
    void deleteToken(String userId, String token);
}
