package com.rich.sodam.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis 설정 클래스
 * JWT 토큰 저장 및 캐시 전략을 관리합니다.
 */
@Configuration
@EnableCaching
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.database:0}")
    private int redisDatabase;

    /**
     * JWT 토큰을 저장하는 데 사용되는 Redis 데이터베이스 연결 설정
     */
    @Bean("jwtConnectionFactory")
    public LettuceConnectionFactory jwtConnectionFactory() {
        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration(redisHost, redisPort);
        redisConfig.setDatabase(redisDatabase);

        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofSeconds(5))
                .build();

        return new LettuceConnectionFactory(redisConfig, lettuceConfig);
    }

    /**
     * 캐시용 Redis 연결 팩토리 (별도 데이터베이스 사용)
     */
    @Bean("cacheConnectionFactory")
    @Primary
    public LettuceConnectionFactory cacheConnectionFactory() {
        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration(redisHost, redisPort);
        redisConfig.setDatabase(1); // 캐시용으로 별도 데이터베이스 사용

        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofSeconds(5))
                .build();

        return new LettuceConnectionFactory(redisConfig, lettuceConfig);
    }

    /**
     * JWT 토큰용 Redis 템플릿
     */
    @Bean("jwtRedisTemplate")
    public RedisTemplate<String, Object> jwtRedisTemplate(@Qualifier("jwtConnectionFactory")
                                                          RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    /**
     * 캐시용 Redis 템플릿
     */
    @Bean("cacheRedisTemplate")
    public RedisTemplate<String, Object> cacheRedisTemplate(@Qualifier("cacheConnectionFactory")
                                                            RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Redis 캐시 매니저 설정
     * 각 캐시별로 다른 TTL 설정
     */
    @Bean
    public CacheManager cacheManager(@Qualifier("cacheConnectionFactory") RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)) // 기본 30분 TTL
                .disableCachingNullValues();

        // 캐시별 개별 설정
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // 사용자 정보 캐시 (1시간)
        cacheConfigurations.put("users", defaultConfig.entryTtl(Duration.ofHours(1)));

        // 매장 정보 캐시 (2시간)
        cacheConfigurations.put("stores", defaultConfig.entryTtl(Duration.ofHours(2)));

        // 출근 기록 캐시 (15분)
        cacheConfigurations.put("attendance", defaultConfig.entryTtl(Duration.ofMinutes(15)));

        // 급여 정보 캐시 (4시간)
        cacheConfigurations.put("payroll", defaultConfig.entryTtl(Duration.ofHours(4)));

        // 정책 정보 캐시 (1시간) - CacheConfig에서 이전된 설정
        cacheConfigurations.put("policyInfo", defaultConfig.entryTtl(Duration.ofHours(1)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }
}
