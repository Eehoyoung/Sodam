package com.rich.sodam.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 엔터프라이즈급 비동기 처리 설정
 * 성능 최적화를 위한 스레드 풀 관리 및 예외 처리를 제공합니다.
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    /**
     * 기본 비동기 작업용 스레드 풀 설정
     * 일반적인 비동기 작업에 사용됩니다.
     */
    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // 기본 스레드 수 (CPU 코어 수 기반)
        executor.setCorePoolSize(Runtime.getRuntime().availableProcessors());

        // 최대 스레드 수 (CPU 코어 수의 2배)
        executor.setMaxPoolSize(Runtime.getRuntime().availableProcessors() * 2);

        // 큐 용량 (대기 작업 수)
        executor.setQueueCapacity(100);

        // 스레드 이름 접두사
        executor.setThreadNamePrefix("Async-Task-");

        // 스레드 유지 시간 (초)
        executor.setKeepAliveSeconds(60);

        // 거부 정책 (큐가 가득 찰 때 호출자 스레드에서 실행)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        // 애플리케이션 종료 시 대기
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.initialize();

        log.info("기본 비동기 스레드 풀 초기화 완료 - 코어: {}, 최대: {}, 큐: {}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());

        return executor;
    }

    /**
     * 이메일 발송용 전용 스레드 풀
     * 이메일 발송과 같은 외부 API 호출에 사용됩니다.
     */
    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // 이메일 발송은 I/O 집약적이므로 더 많은 스레드 허용
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("Email-Task-");
        executor.setKeepAliveSeconds(120);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();

        log.info("이메일 전용 스레드 풀 초기화 완료 - 코어: {}, 최대: {}, 큐: {}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());

        return executor;
    }

    /**
     * 알림 발송용 전용 스레드 풀
     * 푸시 알림, SMS 등의 알림 발송에 사용됩니다.
     */
    @Bean(name = "notificationTaskExecutor")
    public Executor notificationTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("Notification-Task-");
        executor.setKeepAliveSeconds(60);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.initialize();

        log.info("알림 전용 스레드 풀 초기화 완료 - 코어: {}, 최대: {}, 큐: {}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());

        return executor;
    }

    /**
     * 데이터 처리용 전용 스레드 풀
     * 급여 계산, 통계 생성 등의 CPU 집약적 작업에 사용됩니다.
     */
    @Bean(name = "dataProcessingTaskExecutor")
    public Executor dataProcessingTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // CPU 집약적 작업이므로 CPU 코어 수와 동일하게 설정
        executor.setCorePoolSize(Runtime.getRuntime().availableProcessors());
        executor.setMaxPoolSize(Runtime.getRuntime().availableProcessors());
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("DataProcessing-Task-");
        executor.setKeepAliveSeconds(30);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();

        log.info("데이터 처리 전용 스레드 풀 초기화 완료 - 코어: {}, 최대: {}, 큐: {}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());

        return executor;
    }

    /**
     * 비동기 작업 예외 처리
     * 비동기 작업에서 발생하는 예외를 중앙에서 처리합니다.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, objects) -> {
            log.error("비동기 작업 실행 중 예외 발생 - 메서드: {}, 매개변수: {}",
                    method.getName(), objects, throwable);

            // 필요시 알림 발송, 메트릭 수집 등 추가 처리
            // 예: 슬랙 알림, 이메일 알림, 모니터링 시스템 연동
        };
    }
}
