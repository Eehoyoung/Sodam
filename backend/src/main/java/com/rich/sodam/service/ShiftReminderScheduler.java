package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * 출근 셀프 리마인드 (E-NEW-07). 등록된 시프트(B10) 시작 약 15~30분 전 직원에게 알림.
 *
 * <p>15분 간격 스캔 — 시작까지 [15,30)분 창에 든 시프트를 1회 알린다(창이 한 실행에만 걸려 중복 최소).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftReminderScheduler {

    private static final int WINDOW_START_MIN = 15;
    private static final int WINDOW_END_MIN = 30;

    private final WorkShiftRepository workShiftRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0/15 * * * *", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void remindUpcomingShifts() {
        LocalDateTime now = LocalDateTime.now();
        int reminded = 0;
        for (WorkShift shift : workShiftRepository.findByShiftDate(now.toLocalDate())) {
            if (!isDue(shift, now)) {
                continue;
            }
            notificationService.push(shift.getEmployeeId(), PushMessage.builder()
                    .title("곧 출근 시간이에요")
                    .body(String.format("%s 근무가 곧 시작돼요. 출근 잊지 마세요!", shift.getStartTime()))
                    .deepLink("sodam://attendance")
                    .data(Map.of("type", "SHIFT_REMINDER"))
                    .build());
            reminded++;
        }
        if (reminded > 0) {
            log.info("출근 리마인드 발송 {}건", reminded);
        }
    }

    /** 시작까지 [15,30)분 남았는지(리마인드 대상). 시작시간/직원 누락이면 false. */
    boolean isDue(WorkShift shift, LocalDateTime now) {
        if (shift.getStartTime() == null || shift.getEmployeeId() == null || shift.getShiftDate() == null) {
            return false;
        }
        LocalDateTime start = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        long minutes = ChronoUnit.MINUTES.between(now, start);
        return minutes >= WINDOW_START_MIN && minutes < WINDOW_END_MIN;
    }
}
