package com.rich.sodam.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.ThreadMXBean;

/**
 * 엔터프라이즈급 성능 모니터링 및 튜닝 설정
 * JVM 성능 모니터링, 메모리 관리, 스레드 관리를 제공합니다.
 */
@Slf4j
@Configuration
public class PerformanceConfig {

    /**
     * 시스템 성능 모니터링 컴포넌트
     */
    @Component
    public static class SystemPerformanceMonitor {

        private final MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        private final OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        private final ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();

        /**
         * 시스템 성능 지표를 주기적으로 로깅합니다.
         * 매 5분마다 실행됩니다.
         */
        @Scheduled(fixedRate = 300000) // 5분마다 실행
        public void logSystemPerformance() {
            try {
                // 메모리 사용량
                long heapUsed = memoryBean.getHeapMemoryUsage().getUsed() / 1024 / 1024; // MB
                long heapMax = memoryBean.getHeapMemoryUsage().getMax() / 1024 / 1024; // MB
                long nonHeapUsed = memoryBean.getNonHeapMemoryUsage().getUsed() / 1024 / 1024; // MB

                // 스레드 정보
                int threadCount = threadBean.getThreadCount();
                int peakThreadCount = threadBean.getPeakThreadCount();

                log.info("=== 시스템 성능 모니터링 ===");
                log.info("힙 메모리: {}MB / {}MB ({}%)",
                        heapUsed, heapMax, String.format("%.1f", (double) heapUsed / heapMax * 100));
                log.info("비힙 메모리: {}MB", nonHeapUsed);
                log.info("스레드 수: {} (최대: {})", threadCount, peakThreadCount);

                // 메모리 사용률이 80% 이상일 때 경고
                if ((double) heapUsed / heapMax > 0.8) {
                    log.warn("⚠️ 힙 메모리 사용률이 80%를 초과했습니다! 현재: {}%",
                            String.format("%.1f", (double) heapUsed / heapMax * 100));
                }

            } catch (Exception e) {
                log.error("시스템 성능 모니터링 중 오류 발생", e);
            }
        }

        /**
         * 가비지 컬렉션을 수동으로 실행합니다.
         * 메모리 사용률이 높을 때 호출됩니다.
         */
        @Scheduled(fixedRate = 1800000) // 30분마다 실행
        public void performGarbageCollection() {
            long beforeGC = memoryBean.getHeapMemoryUsage().getUsed();

            System.gc(); // 가비지 컬렉션 실행

            // GC 후 잠시 대기
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            long afterGC = memoryBean.getHeapMemoryUsage().getUsed();
            long freedMemory = (beforeGC - afterGC) / 1024 / 1024; // MB

            if (freedMemory > 0) {
                log.info("가비지 컬렉션 완료 - 해제된 메모리: {}MB", freedMemory);
            }
        }
    }

}
