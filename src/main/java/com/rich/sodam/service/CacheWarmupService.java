package com.rich.sodam.service;

import com.rich.sodam.domain.PolicyInfo;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.PolicyInfoRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.CacheManager;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 캐시 워밍업 서비스
 * 애플리케이션 시작 시 자주 사용되는 데이터를 미리 캐시에 로드합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheWarmupService {

    private final CacheManager cacheManager;
    private final PolicyInfoService policyInfoService;
    private final UserRepository userRepository;
    private final PolicyInfoRepository policyInfoRepository;

    /**
     * 애플리케이션 시작 시 캐시 워밍업 실행
     */
    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCache() {
        log.info("캐시 워밍업 시작...");

        try {
            // 1. 정책 정보 캐시 워밍업
            warmUpPolicyInfoCache();

            // 2. 사용자 정보 캐시 워밍업 (최근 활성 사용자)
            warmUpUserCache();

            log.info("캐시 워밍업 완료");
        } catch (Exception e) {
            log.error("캐시 워밍업 중 오류 발생: {}", e.getMessage(), e);
        }
    }

    /**
     * 정책 정보 캐시 워밍업
     */
    private void warmUpPolicyInfoCache() {
        try {
            log.info("정책 정보 캐시 워밍업 시작");

            // 최근 정책 정보 캐시
            policyInfoService.getRecentPolicyInfos();

            // 전체 정책 정보 캐시 (데이터가 많지 않은 경우에만)
            List<PolicyInfo> allPolicies = policyInfoRepository.findAll();
            if (allPolicies.size() <= 100) { // 100개 이하인 경우에만 전체 캐시
                policyInfoService.getAllPolicyInfos();
            }

            // 첫 번째 페이지 캐시
            Pageable firstPage = PageRequest.of(0, 20);
            policyInfoService.getPolicyInfosWithPagination(firstPage);

            log.info("정책 정보 캐시 워밍업 완료 - {} 개 항목", allPolicies.size());
        } catch (Exception e) {
            log.error("정책 정보 캐시 워밍업 실패: {}", e.getMessage());
        }
    }

    /**
     * 사용자 정보 캐시 워밍업
     */
    private void warmUpUserCache() {
        try {
            log.info("사용자 정보 캐시 워밍업 시작");

            // 최근 생성된 사용자 20명의 이메일로 캐시 워밍업
            List<User> recentUsers = userRepository.findTop20ByOrderByCreatedAtDesc();

            for (User user : recentUsers) {
                try {
                    // 캐시에 직접 저장
                    cacheManager.getCache("users").put(user.getEmail(), java.util.Optional.of(user));
                } catch (Exception e) {
                    log.warn("사용자 캐시 워밍업 실패 - 사용자 ID: {}, 오류: {}", user.getId(), e.getMessage());
                }
            }

            log.info("사용자 정보 캐시 워밍업 완료 - {} 명", recentUsers.size());
        } catch (Exception e) {
            log.error("사용자 정보 캐시 워밍업 실패: {}", e.getMessage());
        }
    }

    /**
     * 수동 캐시 워밍업 (관리자용)
     */
    public void manualWarmUp() {
        log.info("수동 캐시 워밍업 시작");
        warmUpCache();
    }

    /**
     * 캐시 통계 정보 조회
     */
    public String getCacheStatistics() {
        StringBuilder stats = new StringBuilder();
        stats.append("=== 캐시 통계 정보 ===\n");

        // 캐시별 통계 정보
        cacheManager.getCacheNames().forEach(cacheName -> {
            var cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                stats.append(String.format("캐시명: %s\n", cacheName));
                // Redis 캐시의 경우 정확한 통계를 얻기 어려우므로 기본 정보만 표시
                stats.append("상태: 활성\n");
                stats.append("---\n");
            }
        });

        return stats.toString();
    }
}
