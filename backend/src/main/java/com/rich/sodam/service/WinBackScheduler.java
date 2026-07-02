package com.rich.sodam.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 휴면 사장 win-back 배치(GR-NEW-05).
 * 매일 오전 10:00 KST 에 휴면 전환 D+7 / D+30 사장에게 복귀 유도 알림을 발송한다.
 * 슬립 배치(03:30) 와 시간을 분리해 그날 전환분이 모두 반영된 뒤 발송한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WinBackScheduler {

    private final WinBackService winBackService;

    @Scheduled(cron = "0 0 10 * * *", zone = "Asia/Seoul")
    public void runDailyWinBack() {
        int sent = winBackService.sendWinBackForDay(LocalDateTime.now());
        if (sent > 0) {
            log.info("WinBackScheduler 완료: {}건 발송", sent);
        }
    }
}
