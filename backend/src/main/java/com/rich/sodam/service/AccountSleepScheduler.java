package com.rich.sodam.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 90일 슬립 배치. 매일 새벽 03:30 KST 에 비활성 무료 계정을 휴면 처리(MAU 정화).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccountSleepScheduler {

    private static final int INACTIVE_DAYS = 90;

    private final AccountSleepService accountSleepService;

    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Seoul")
    public void runDailySleep() {
        int slept = accountSleepService.sleepDormantFreeSubscriptions(LocalDateTime.now(), INACTIVE_DAYS);
        if (slept > 0) {
            log.info("AccountSleepScheduler 완료: {}건 휴면", slept);
        }
    }
}
