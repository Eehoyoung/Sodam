package com.rich.sodam.service;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 휴면 사장 win-back 시퀀스(GR-NEW-05).
 *
 * 90일 슬립으로 휴면 전환된 사장에게 복귀 유도 알림을 D+7 / D+30 에 1회씩 발송해 churn 을 보정한다.
 * 목적은 비용절감이 아니라 재참여 트리거(AccountSleepService 주석 참조).
 *
 * 중복 방지: 임계 '그날'(dormantAt 기준 정확히 N일 전 날짜)에 해당하는 휴면만 잡으므로,
 * 스케줄러가 하루 1회 호출하면 각 임계마다 정확히 1회씩 발송된다.
 * 스팸 방지: D+30 을 넘긴 장기 휴면(폐업 추정)은 어떤 임계에도 걸리지 않아 발송되지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WinBackService {

    /** 휴면 전환 후 win-back 알림을 보내는 임계일(일 단위). */
    static final int[] WIN_BACK_DAYS = {7, 30};

    private final SubscriptionRepository subscriptionRepository;
    private final NotificationService notificationService;

    /**
     * {@code asOf} 기준 win-back 임계(D+7/D+30)에 해당하는 휴면 사장에게 복귀 알림 발송.
     *
     * @return 발송 건수
     */
    @Transactional(readOnly = true)
    public int sendWinBackForDay(LocalDateTime asOf) {
        int sent = 0;
        for (int days : WIN_BACK_DAYS) {
            // dormantAt 의 '날짜'가 (asOf - days)일 인 휴면 구독만 — 시각 무관, 그날 전환분 전부.
            LocalDate targetDate = asOf.toLocalDate().minusDays(days);
            LocalDateTime from = targetDate.atStartOfDay();
            LocalDateTime to = from.plusDays(1);

            List<Subscription> candidates = subscriptionRepository.findDormantBetween(from, to);
            for (Subscription sub : candidates) {
                User owner = sub.getUser();
                if (owner == null) continue;
                notificationService.notifyWinBack(owner.getId());
                sent++;
            }
            if (!candidates.isEmpty()) {
                log.info("win-back D+{} 발송: {}건 (전환일={})", days, candidates.size(), targetDate);
            }
        }
        return sent;
    }
}
