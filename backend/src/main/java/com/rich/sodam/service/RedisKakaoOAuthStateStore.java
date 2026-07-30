package com.rich.sodam.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/** Redis-backed, one-time OAuth transaction storage for production instances. */
@Service
@Profile("!dev & !test")
public class RedisKakaoOAuthStateStore implements KakaoOAuthStateStore {

    private static final String PREFIX = "oauth:kakao:state:";
    private final RedisTemplate<String, Object> redis;

    public RedisKakaoOAuthStateStore(@Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redis) {
        this.redis = redis;
    }

    @Override
    public void save(String state, String verifierDigest, Duration ttl) {
        redis.opsForValue().set(PREFIX + state, verifierDigest, ttl);
    }

    @Override
    public String consume(String state) {
        Object value = redis.opsForValue().getAndDelete(PREFIX + state);
        return value instanceof String string ? string : null;
    }
}
