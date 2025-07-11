package com.rich.sodam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.actuate.autoconfigure.health.HealthEndpointAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.metrics.MetricsAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.data.web.SpringDataWebAutoConfiguration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(exclude = {
        MetricsAutoConfiguration.class,
        HealthEndpointAutoConfiguration.class,
        ObservationAutoConfiguration.class,
        SpringDataWebAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
})
@EnableJpaRepositories(basePackages = "com.rich.sodam.repository")
public class SodamApplication {

    public static void main(String[] args) {
        SpringApplication.run(SodamApplication.class, args);
    }
}
