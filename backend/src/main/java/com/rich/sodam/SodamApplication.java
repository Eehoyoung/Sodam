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
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.core.Ordered;

// order를 트랜잭션 어드바이스보다 낮게(=우선순위 높게, 바깥쪽) 설정 — 그래야 낙관적/비관적 락
// 충돌로 재시도할 때 이미 rollback-only 로 마킹된 "같은" 트랜잭션 안에서 재시도하는 게 아니라,
// 재시도마다 트랜잭션이 통째로 새로 시작된다(§2.8 대응방안, spring-retry 사용 전제조건).
@EnableRetry(order = Ordered.LOWEST_PRECEDENCE - 1)
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
