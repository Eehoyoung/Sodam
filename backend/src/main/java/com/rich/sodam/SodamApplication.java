package com.rich.sodam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.actuate.autoconfigure.health.HealthEndpointAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.metrics.MetricsAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.data.web.SpringDataWebAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = {
        MetricsAutoConfiguration.class,
        HealthEndpointAutoConfiguration.class,
        ObservationAutoConfiguration.class,
        SpringDataWebAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
}, scanBasePackages = "com.rich.sodam")
// 모듈형 패키지(personal 등) 자동 포함을 위해 base 통째 스캔
@EnableJpaRepositories(basePackages = {
        "com.rich.sodam.repository",
        "com.rich.sodam.personal.repository"
})
@EntityScan(basePackages = {
        "com.rich.sodam.domain",
        "com.rich.sodam.personal.domain"
})
@EnableScheduling
@EnableAsync
public class SodamApplication {

    public static void main(String[] args) {
        SpringApplication.run(SodamApplication.class, args);
    }
}
