package com.rich.sodam.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import jakarta.annotation.PostConstruct;

/**
 * dev/에뮬레이터 프로필 전용 인프라 설정.
 * - Redis 없이 동작 (ConcurrentMapCacheManager)
 * - 외부 결제/푸시/에러추적 서비스는 모두 Mock 으로 자동 주입 (각 Integration*Config 참조)
 *
 * 운영(local/prod) 프로필에서는 {@link RedisConfig} 가 활성화된다.
 */
@Slf4j
@Configuration
@EnableCaching
@Profile("dev")
public class DevInfraConfig {

    /**
     * 캐시명별 TTL 차이가 필요한 운영과 달리, dev 는 단순 ConcurrentMap 캐시로 충분.
     * 캐시명은 RedisConfig 와 동일하게 사전 등록한다 (애노테이션 기반 @Cacheable 동작 보장).
     */
    @Bean
    @Primary
    public CacheManager cacheManager() {
        log.info("DevInfraConfig: ConcurrentMapCacheManager 등록 (Redis 없이 인메모리 캐시)");
        return new ConcurrentMapCacheManager(
                "users", "stores", "attendance", "payroll",
                "policyInfo", "sessions", "subscriptions", "notifications"
        );
    }

    /**
     * dev 프로필 placeholder — `cacheRedisTemplate`/`jwtRedisTemplate` 을 요구하는 빈들이 존재
     * (예: CacheMetricsService 는 `@Profile("!dev")` 로 빠지지만 PersonalUserController 같은
     * 별도 모듈은 그대로 살아있다). 실제 Redis 미연동 환경에서 부팅만 통과시키기 위한 lazy
     * 커넥션 팩토리.
     *
     * 호출 시점에는 Redis 가 없으면 실패한다 — 부팅을 막지는 않는다.
     */
    @Bean
    public RedisConnectionFactory cacheConnectionFactory() {
        RedisStandaloneConfiguration cfg = new RedisStandaloneConfiguration("localhost", 6379);
        LettuceClientConfiguration client = LettuceClientConfiguration.builder().build();
        LettuceConnectionFactory factory = new LettuceConnectionFactory(cfg, client);
        factory.setValidateConnection(false); // dev 미연동 환경에서 부팅 차단 방지
        return factory;
    }

    @Bean(name = "cacheRedisTemplate")
    public RedisTemplate<String, Object> cacheRedisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> t = new RedisTemplate<>();
        t.setConnectionFactory(connectionFactory);
        t.setKeySerializer(new StringRedisSerializer());
        t.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        t.setHashKeySerializer(new StringRedisSerializer());
        t.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        t.afterPropertiesSet();
        return t;
    }

    /** JWT 토큰 저장소는 dev 프로필에서 {@link com.rich.sodam.service.InMemoryTokenStore} 가 처리 — 본 빈은 보조용. */
    @Bean(name = "jwtRedisTemplate")
    public RedisTemplate<String, Object> jwtRedisTemplate(RedisConnectionFactory connectionFactory) {
        return cacheRedisTemplate(connectionFactory);
    }
}
