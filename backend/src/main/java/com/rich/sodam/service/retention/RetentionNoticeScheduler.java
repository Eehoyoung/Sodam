package com.rich.sodam.service.retention;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 보존기간 만료 스캔·(향후) 고지·실제 파기를 매일 실행하는 배치
 * (DB_OPTIMIZATION_PLAN.md §2.2(c), Phase 6).
 *
 * <p><b>scan(스케줄 등록)은 항상 실행</b> — 원본 데이터를 건드리지 않는 되돌릴 수 있는 작업이라
 * 안전하다. <b>실제 파기(execute)는 기본 비활성</b> —
 * {@code sodam.retention.purge.execute-enabled=true}로 명시적으로 켜야 한다(운영 적용 전 스테이징
 * 검증 필수, §2.2(c) "유예·고지 없이는 실행하지 않음" 원칙과 동일하게 이 세션은 실제 파기를
 * 자동으로 켜지 않는다).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RetentionNoticeScheduler {

    private final RetentionPurgeService retentionPurgeService;

    @Value("${sodam.retention.purge.execute-enabled:false}")
    private boolean purgeExecutionEnabled;

    /** 매일 03:30 KST — UserDataRetentionScheduler(03:10)와 겹치지 않게 20분 뒤. */
    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Seoul")
    public void run() {
        try {
            retentionPurgeService.scanAndSchedule();
        } catch (Exception e) {
            log.error("[RetentionPurge] scanAndSchedule 실패: {}", e.getMessage(), e);
        }

        if (!purgeExecutionEnabled) {
            return;
        }
        try {
            retentionPurgeService.executePurge();
        } catch (Exception e) {
            log.error("[RetentionPurge] executePurge 실패: {}", e.getMessage(), e);
        }
    }
}
