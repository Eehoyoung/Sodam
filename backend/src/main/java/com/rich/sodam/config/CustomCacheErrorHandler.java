package com.rich.sodam.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.stereotype.Component;

/**
 * 캐시 오류 처리기
 * Redis 캐시 장애 시 애플리케이션이 정상 동작하도록 보장합니다.
 */
@Slf4j
@Component
public class CustomCacheErrorHandler implements CacheErrorHandler {

    @Override
    public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
        log.error("캐시 조회 오류 - 캐시명: {}, 키: {}, 오류: {}",
                cache.getName(), key, exception.getMessage());

        // 캐시 조회 실패 시에도 애플리케이션이 계속 동작하도록 함
        // 실제 데이터는 데이터베이스에서 조회됨
    }

    @Override
    public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
        log.error("캐시 저장 오류 - 캐시명: {}, 키: {}, 오류: {}",
                cache.getName(), key, exception.getMessage());

        // 캐시 저장 실패 시에도 애플리케이션이 계속 동작하도록 함
        // 데이터는 정상적으로 데이터베이스에 저장됨
    }

    @Override
    public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
        log.error("캐시 삭제 오류 - 캐시명: {}, 키: {}, 오류: {}",
                cache.getName(), key, exception.getMessage());

        // 캐시 삭제 실패 시에도 애플리케이션이 계속 동작하도록 함
    }

    @Override
    public void handleCacheClearError(RuntimeException exception, Cache cache) {
        log.error("캐시 전체 삭제 오류 - 캐시명: {}, 오류: {}",
                cache.getName(), exception.getMessage());

        // 캐시 전체 삭제 실패 시에도 애플리케이션이 계속 동작하도록 함
    }
}
