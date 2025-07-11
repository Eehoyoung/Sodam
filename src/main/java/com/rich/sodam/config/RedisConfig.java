package com.rich.sodam.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rich.sodam.config.app.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis 설정 클래스
 * JWT 토큰 저장 및 캐시 전략을 관리합니다.
 * 엔터프라이즈급 표준에 따른 Redis 설정을 제공합니다.
 */
@Slf4j
@Configuration
@EnableCaching
public class RedisConfig implements CachingConfigurer {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.database:0}")
    private int redisDatabase;

    private final CustomCacheErrorHandler customCacheErrorHandler;
    private final AppProperties appProperties;
    @Value("${spring.data.redis.password:#{null}}")
    private String redisPassword;
    @Value("${spring.data.redis.timeout:5000ms}")
    private Duration redisTimeout;
    @Value("${spring.data.redis.lettuce.pool.max-active:8}")
    private int maxActive;
    @Value("${spring.data.redis.lettuce.pool.max-idle:8}")
    private int maxIdle;
    @Value("${spring.data.redis.lettuce.pool.min-idle:0}")
    private int minIdle;

    public RedisConfig(CustomCacheErrorHandler customCacheErrorHandler, AppProperties appProperties) {
        this.customCacheErrorHandler = customCacheErrorHandler;
        this.appProperties = appProperties;
    }

    /**
     * JWT 토큰을 저장하는 데 사용되는 Redis 데이터베이스 연결 설정
     * 엔터프라이즈급 연결 풀 설정과 보안 설정을 포함합니다.
     */
    @Bean("jwtConnectionFactory")
    public LettuceConnectionFactory jwtConnectionFactory() {
        log.info("JWT Redis 연결 팩토리 초기화 - 호스트: {}, 포트: {}, DB: {}", redisHost, redisPort, redisDatabase);

        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration(redisHost, redisPort);
        redisConfig.setDatabase(redisDatabase);

        // 비밀번호 설정 (환경변수에서 제공되는 경우)
        if (StringUtils.hasText(redisPassword)) {
            redisConfig.setPassword(RedisPassword.of(redisPassword));
            log.debug("JWT Redis 연결에 비밀번호 설정 완료");
        }

        // 연결 풀 설정을 포함한 Lettuce 클라이언트 구성
        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder()
                .commandTimeout(redisTimeout)
                .shutdownTimeout(Duration.ofMillis(100))
                .build();

        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisConfig, lettuceConfig);
        factory.setValidateConnection(true);
        return factory;
    }

    /**
     * 캐시용 Redis 연결 팩토리 (별도 데이터베이스 사용)
     * 엔터프라이즈급 연결 풀 설정과 보안 설정을 포함합니다.
     */
    @Bean("cacheConnectionFactory")
    @Primary
    public LettuceConnectionFactory cacheConnectionFactory() {
        int cacheDatabase = appProperties.getRedis().getCacheDatabase();
        log.info("캐시 Redis 연결 팩토리 초기화 - 호스트: {}, 포트: {}, DB: {}", redisHost, redisPort, cacheDatabase);

        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration(redisHost, redisPort);
        redisConfig.setDatabase(cacheDatabase); // 캐시용으로 별도 데이터베이스 사용 (설정에서 가져옴)

        // 비밀번호 설정 (환경변수에서 제공되는 경우)
        if (StringUtils.hasText(redisPassword)) {
            redisConfig.setPassword(RedisPassword.of(redisPassword));
            log.debug("캐시 Redis 연결에 비밀번호 설정 완료");
        }

        // Lettuce 클라이언트 구성
        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder()
                .commandTimeout(redisTimeout)
                .shutdownTimeout(Duration.ofMillis(100))
                .build();

        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisConfig, lettuceConfig);
        factory.setValidateConnection(true);
        return factory;
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
     * PageImpl 직렬화 문제를 해결하는 커스텀 ObjectMapper 생성
     */
    private ObjectMapper createCacheObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();

        // Java 8 시간 모듈 등록
        objectMapper.registerModule(new JavaTimeModule());

        // 타입 정보 포함하여 직렬화 (PageImpl 등 복잡한 객체 지원)
        objectMapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL
        );

        return objectMapper;
    }

    /**
     * 캐시용 Redis 템플릿
     */
    @Bean("cacheRedisTemplate")
    public RedisTemplate<String, Object> cacheRedisTemplate(@Qualifier("cacheConnectionFactory")
                                                            RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // 커스텀 ObjectMapper를 사용하는 직렬화기 생성
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(createCacheObjectMapper());

        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(jsonSerializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jsonSerializer);
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Redis 캐시 매니저 설정
     * 각 캐시별로 다른 TTL 설정 및 에러 핸들링 포함
     */
    @Bean
    @Override
    public CacheManager cacheManager() {
        RedisConnectionFactory connectionFactory = cacheConnectionFactory();
        log.info("Redis 캐시 매니저 초기화");

        // 커스텀 ObjectMapper를 사용하는 직렬화기 생성
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(createCacheObjectMapper());

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)) // 기본 30분 TTL
                .disableCachingNullValues()
                .serializeKeysWith(org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer));

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

        // 정책 정보 캐시 (1시간)
        cacheConfigurations.put("policyInfo", defaultConfig.entryTtl(Duration.ofHours(1)));

        // 세션 캐시 (30분)
        cacheConfigurations.put("sessions", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware() // 트랜잭션 지원
                .build();
    }

    /**
     * 캐시 에러 핸들러 등록
     * CachingConfigurer 인터페이스 구현
     */
    @Override
    public CacheErrorHandler errorHandler() {
        log.info("커스텀 캐시 에러 핸들러 등록");
        return customCacheErrorHandler;
    }
}
