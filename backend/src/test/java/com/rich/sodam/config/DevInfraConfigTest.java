package com.rich.sodam.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import static org.assertj.core.api.Assertions.assertThat;

class DevInfraConfigTest {

    @Test
    void cacheConnectionFactoryUsesConfiguredRedisHostAndPort() {
        RedisProperties properties = new RedisProperties();
        properties.setHost("redis-for-dev-test");
        properties.setPort(16379);

        LettuceConnectionFactory factory = (LettuceConnectionFactory)
                new DevInfraConfig(properties).cacheConnectionFactory();
        RedisStandaloneConfiguration configuration = factory.getStandaloneConfiguration();

        assertThat(configuration.getHostName()).isEqualTo("redis-for-dev-test");
        assertThat(configuration.getPort()).isEqualTo(16379);
    }
}
