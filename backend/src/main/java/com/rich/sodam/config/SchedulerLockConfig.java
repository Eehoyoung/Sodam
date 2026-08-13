package com.rich.sodam.config;

import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.core.SimpleLock;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 스케줄러 다중 인스턴스 안전화 (SV-07).
 *
 * <p>이 서비스의 {@code @Scheduled} 배치에는 정기결제({@code BillingScheduler})와 월 급여
 * 계산({@code PayrollMonthlyBatchScheduler})처럼 <b>중복 실행되면 돈이 두 번 나가는</b> 작업이
 * 있다. 단일 인스턴스에서는 문제가 없지만 수평 확장하는 순간 모든 인스턴스가 같은 시각에 같은
 * 배치를 돌린다. 확장 전에 반드시 들어가 있어야 하는 선결조건이라 미리 깔아 둔다.</p>
 *
 * <p><b>락을 걸지 않는 예외</b>: {@code PerformanceConfig} 의 JVM 메모리·스레드 로깅과 GC 는
 * "그 인스턴스의" 상태를 다루므로 인스턴스마다 각자 돌아야 한다. 락을 걸면 한 대만 관측된다.</p>
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class SchedulerLockConfig {

    /**
     * 운영(prod)은 DB 락을 쓴다. 테이블은 Flyway V90 이 만든다.
     *
     * <p>{@code usingDbTime()} — 락 만료 판정에 애플리케이션 시각이 아니라 DB 시각을 쓴다.
     * 인스턴스 간 시계가 어긋나도 락이 조기 해제되지 않는다.</p>
     */
    @Bean
    @Profile("prod")
    public LockProvider jdbcLockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new JdbcTemplate(dataSource))
                        .withTableName("shedlock")
                        .usingDbTime()
                        .build());
    }

    /**
     * dev·test 는 정의상 단일 인스턴스라 DB 락이 필요 없다. 다만 {@code @SchedulerLock} 이 붙은
     * 메서드가 있으면 ShedLock 이 {@link LockProvider} 빈을 요구하므로 메모리 구현을 둔다.
     * 이렇게 하면 Flyway 를 쓰지 않는 dev·test 에 shedlock 테이블 DDL 을 따로 만들지 않아도 된다.
     */
    @Bean
    @ConditionalOnMissingBean(LockProvider.class)
    public LockProvider inMemoryLockProvider() {
        return new InMemoryLockProvider();
    }

    /** 같은 JVM 안에서만 유효한 락. 다중 인스턴스 보호 용도가 아니다. */
    static class InMemoryLockProvider implements LockProvider {

        private final Map<String, Instant> heldUntil = new ConcurrentHashMap<>();

        @Override
        public Optional<SimpleLock> lock(LockConfiguration configuration) {
            String name = configuration.getName();
            Instant now = Instant.now();
            Instant previous = heldUntil.get(name);
            if (previous != null && previous.isAfter(now)) {
                return Optional.empty();
            }
            heldUntil.put(name, configuration.getLockAtMostUntil());
            return Optional.of(new SimpleLock() {
                @Override
                public void unlock() {
                    heldUntil.remove(name);
                }
            });
        }
    }
}
