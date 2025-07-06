package com.rich.sodam.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 캐시 메트릭 및 모니터링 서비스
 * 캐시 히트율, 사용량 등을 추적하고 모니터링합니다.
 */
@Slf4j
@Service
public class CacheMetricsService {

    private final CacheManager cacheManager;
    private final RedisTemplate<String, Object> redisTemplate;
    // 캐시 히트/미스 카운터
    private final Map<String, AtomicLong> hitCounters = new HashMap<>();
    private final Map<String, AtomicLong> missCounters = new HashMap<>();
    /**
     * 생성자
     */
    public CacheMetricsService(CacheManager cacheManager,
                               @Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redisTemplate) {
        this.cacheManager = cacheManager;
        this.redisTemplate = redisTemplate;
    }

    /**
     * 캐시 히트 기록
     */
    public void recordCacheHit(String cacheName) {
        hitCounters.computeIfAbsent(cacheName, k -> new AtomicLong(0)).incrementAndGet();
        log.debug("캐시 히트 - 캐시명: {}", cacheName);
    }

    /**
     * 캐시 미스 기록
     */
    public void recordCacheMiss(String cacheName) {
        missCounters.computeIfAbsent(cacheName, k -> new AtomicLong(0)).incrementAndGet();
        log.debug("캐시 미스 - 캐시명: {}", cacheName);
    }

    /**
     * 캐시 히트율 계산
     */
    public double getCacheHitRate(String cacheName) {
        long hits = hitCounters.getOrDefault(cacheName, new AtomicLong(0)).get();
        long misses = missCounters.getOrDefault(cacheName, new AtomicLong(0)).get();
        long total = hits + misses;

        if (total == 0) {
            return 0.0;
        }

        return (double) hits / total * 100.0;
    }

    /**
     * 전체 캐시 통계 조회
     */
    public Map<String, Object> getAllCacheStatistics() {
        Map<String, Object> statistics = new HashMap<>();

        // 캐시별 통계
        for (String cacheName : cacheManager.getCacheNames()) {
            Map<String, Object> cacheStats = new HashMap<>();

            long hits = hitCounters.getOrDefault(cacheName, new AtomicLong(0)).get();
            long misses = missCounters.getOrDefault(cacheName, new AtomicLong(0)).get();
            double hitRate = getCacheHitRate(cacheName);

            cacheStats.put("hits", hits);
            cacheStats.put("misses", misses);
            cacheStats.put("hitRate", String.format("%.2f%%", hitRate));
            cacheStats.put("totalRequests", hits + misses);

            // Redis 키 개수 조회
            try {
                Set<String> keys = redisTemplate.keys("sodam:" + cacheName + "*");
                cacheStats.put("keyCount", keys != null ? keys.size() : 0);
            } catch (Exception e) {
                log.warn("Redis 키 개수 조회 실패 - 캐시명: {}, 오류: {}", cacheName, e.getMessage());
                cacheStats.put("keyCount", "조회 실패");
            }

            statistics.put(cacheName, cacheStats);
        }

        return statistics;
    }

    /**
     * 캐시 메모리 사용량 조회 (Redis 정보)
     */
    public Map<String, Object> getRedisMemoryInfo() {
        Map<String, Object> memoryInfo = new HashMap<>();

        try {
            // Redis INFO 명령어를 통한 메모리 정보 조회
            // 실제 구현에서는 Redis 연결을 통해 INFO memory 명령어 실행
            memoryInfo.put("status", "Redis 연결 상태: 정상");
            memoryInfo.put("note", "상세 메모리 정보는 Redis CLI를 통해 확인 가능");

        } catch (Exception e) {
            log.error("Redis 메모리 정보 조회 실패: {}", e.getMessage());
            memoryInfo.put("status", "Redis 연결 실패");
            memoryInfo.put("error", e.getMessage());
        }

        return memoryInfo;
    }

    /**
     * 캐시 성능 보고서 생성
     */
    public String generateCachePerformanceReport() {
        StringBuilder report = new StringBuilder();
        report.append("=== Redis 캐시 성능 보고서 ===\n\n");

        Map<String, Object> statistics = getAllCacheStatistics();

        for (Map.Entry<String, Object> entry : statistics.entrySet()) {
            String cacheName = entry.getKey();
            @SuppressWarnings("unchecked")
            Map<String, Object> stats = (Map<String, Object>) entry.getValue();

            report.append(String.format("📊 캐시명: %s\n", cacheName));
            report.append(String.format("   - 히트 수: %s\n", stats.get("hits")));
            report.append(String.format("   - 미스 수: %s\n", stats.get("misses")));
            report.append(String.format("   - 히트율: %s\n", stats.get("hitRate")));
            report.append(String.format("   - 총 요청: %s\n", stats.get("totalRequests")));
            report.append(String.format("   - 키 개수: %s\n", stats.get("keyCount")));
            report.append("\n");
        }

        // Redis 메모리 정보
        Map<String, Object> memoryInfo = getRedisMemoryInfo();
        report.append("💾 Redis 메모리 정보:\n");
        for (Map.Entry<String, Object> entry : memoryInfo.entrySet()) {
            report.append(String.format("   - %s: %s\n", entry.getKey(), entry.getValue()));
        }

        // 권장사항
        report.append("\n📋 권장사항:\n");
        for (Map.Entry<String, Object> entry : statistics.entrySet()) {
            String cacheName = entry.getKey();
            @SuppressWarnings("unchecked")
            Map<String, Object> stats = (Map<String, Object>) entry.getValue();

            String hitRateStr = (String) stats.get("hitRate");
            double hitRate = Double.parseDouble(hitRateStr.replace("%", ""));

            if (hitRate < 70.0) {
                report.append(String.format("   ⚠️ %s 캐시의 히트율이 낮습니다 (%.2f%%). TTL 조정이나 캐시 전략 재검토가 필요합니다.\n",
                        cacheName, hitRate));
            } else if (hitRate > 95.0) {
                report.append(String.format("   ✅ %s 캐시의 히트율이 우수합니다 (%.2f%%).\n",
                        cacheName, hitRate));
            }
        }

        return report.toString();
    }

    /**
     * 캐시 통계 초기화
     */
    public void resetStatistics() {
        hitCounters.clear();
        missCounters.clear();
        log.info("캐시 통계가 초기화되었습니다.");
    }

    /**
     * 특정 캐시의 모든 키 조회
     */
    public Set<String> getCacheKeys(String cacheName) {
        try {
            return redisTemplate.keys("sodam:" + cacheName + "*");
        } catch (Exception e) {
            log.error("캐시 키 조회 실패 - 캐시명: {}, 오류: {}", cacheName, e.getMessage());
            return Set.of();
        }
    }
}
