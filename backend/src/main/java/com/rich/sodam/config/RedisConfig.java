package com.rich.sodam.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    // JWT 토큰을 저장하는 데 사용되는 Redis 데이터베이스 연결 설정
    @Bean("jwtConnectionFactory")
    public LettuceConnectionFactory jwtConnectionFactory() {
        // localhost에 실행중인 Redis 서버의 6379 포트로 연결 설정, 사용할 데이터베이스는 0번
        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration("localhost", 6379);
        redisConfig.setDatabase(0);

        LettuceClientConfiguration lettuceConfig = LettuceClientConfiguration.builder().build();

        return new LettuceConnectionFactory(redisConfig, lettuceConfig);
    }

    // JWT 토큰을 위한 레디스 템플릿 생성
    @Bean("jwtRedisTemplate")
    public RedisTemplate<String, Object> jwtRedisTemplate(@Qualifier("jwtConnectionFactory")
                                                          RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean("redisTemplate")
    public RedisTemplate<String, Object> redisTemplate(@Qualifier("jwtConnectionFactory")
                                                       RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
