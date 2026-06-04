package com.rich.sodam.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 회원 탈퇴 PII 파기/익명화 배치 (PIPA §21).
 *
 * 처리방침: "탈퇴 후 90일 보관 후 파기".
 * 매일 새벽 03:10(KST)에 보관기간이 경과한 탈퇴 회원의
 * phone/birthDate 를 파기(null)하고 name 을 '탈퇴회원'으로 익명화한다.
 *
 * <p>중복 처리 방지: 익명화 완료 행은 pii_anonymized_at 마킹으로 다음 실행에서 제외.
 * <p>단일 인스턴스 가정 — 다중 인스턴스 운영 시 ShedLock 등 분산 락 필요(TODO 운영).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserDataRetentionScheduler {

    private final UserService userService;

    /** 매일 03:10 KST. */
    @Scheduled(cron = "0 10 3 * * *", zone = "Asia/Seoul")
    public void anonymizeExpiredWithdrawnUsers() {
        try {
            int count = userService.anonymizeExpiredWithdrawnUsers();
            if (count > 0) {
                log.info("UserDataRetentionScheduler: 탈퇴 회원 PII 익명화 {}건", count);
            }
        } catch (Exception e) {
            // 배치 실패가 애플리케이션을 중단시키지 않도록 방어 — 다음 실행에서 재시도.
            log.error("UserDataRetentionScheduler 실행 실패: {}", e.getMessage(), e);
        }
    }
}
