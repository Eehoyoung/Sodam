package com.rich.sodam.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * 엔터프라이즈급 배치 처리 설정
 * 대용량 데이터 처리 및 정기 작업을 위한 스케줄링 설정을 제공합니다.
 */
@Slf4j
@Configuration
@EnableScheduling
public class BatchConfig {

    /**
     * 배치 작업용 스케줄러 설정
     * 정기적인 배치 작업(급여 계산, 통계 생성 등)에 사용됩니다.
     */
    @Bean(name = "batchTaskScheduler")
    @Primary
    public ThreadPoolTaskScheduler batchTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        // 배치 작업은 동시에 많이 실행되지 않으므로 적은 수의 스레드 사용
        scheduler.setPoolSize(5);

        // 스레드 이름 접두사
        scheduler.setThreadNamePrefix("Batch-Scheduler-");

        // 애플리케이션 종료 시 대기
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);

        // 스레드가 데몬 스레드가 되지 않도록 설정 (애플리케이션 종료 방지)
        scheduler.setDaemon(false);

        scheduler.initialize();

        log.info("배치 작업 스케줄러 초기화 완료 - 풀 크기: {}", scheduler.getPoolSize());

        return scheduler;
    }

    /**
     * 실시간 처리용 스케줄러 설정
     * 짧은 주기의 실시간 작업(캐시 갱신, 모니터링 등)에 사용됩니다.
     */
    @Bean(name = "realtimeTaskScheduler")
    public ThreadPoolTaskScheduler realtimeTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        // 실시간 작업은 빈번하므로 더 많은 스레드 사용
        scheduler.setPoolSize(10);

        // 스레드 이름 접두사
        scheduler.setThreadNamePrefix("Realtime-Scheduler-");

        // 애플리케이션 종료 시 대기
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(30);

        // 스레드가 데몬 스레드가 되지 않도록 설정
        scheduler.setDaemon(false);

        scheduler.initialize();

        log.info("실시간 작업 스케줄러 초기화 완료 - 풀 크기: {}", scheduler.getPoolSize());

        return scheduler;
    }
}
