package com.rich.sodam.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 정기결제 배치.
 * 매일 새벽 03:00 KST 에 만기 도래 구독을 청구.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BillingScheduler {

    private final SubscriptionService subscriptionService;

    /** 매일 03:00 (KST) — application 이 KST 로 설정된 경우. */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void runDailyBilling() {
        int processed = subscriptionService.runScheduledBilling(LocalDateTime.now());
        log.info("BillingScheduler 완료: {}건 처리", processed);
    }
}
