package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 출퇴근 누락 감지 스케줄러.
 *
 * 룰:
 *  - 운영시작 + 30분 후 출근 기록 없는 직원 → 본인+사장에게 푸시
 *  - 운영종료 + 60분 후 미퇴근 직원(체크인만 있고 체크아웃 없음) → 본인+사장에게 푸시
 *
 * 빈도: 매 15분.
 * 중복 알림 방지: 단일 인스턴스에서 발송 후 메모리 캐시 — 단순 PoC. 운영에서는 Redis SETNX 권장.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceMissingScheduler {

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final AttendanceRepository attendanceRepository;
    private final NotificationService notificationService;

    /** 매 15분마다 점검. */
    @Scheduled(cron = "0 */15 * * * *", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void detectMissingAttendance() {
        LocalDateTime now = LocalDateTime.now();
        DayOfWeek today = now.getDayOfWeek();
        LocalTime nowTime = now.toLocalTime();

        List<Store> stores = storeRepository.findAll();
        int missingCount = 0;

        for (Store store : stores) {
            if (!store.isActive()) continue;
            if (store.getOperatingHours() == null) continue;
            if (!store.getOperatingHours().isOpenOn(today)) continue;

            LocalTime openTime = store.getOperatingHours().getOpenTime(today);
            LocalTime closeTime = store.getOperatingHours().getCloseTime(today);
            if (openTime == null || closeTime == null) continue;

            boolean afterOpening30Min = nowTime.isAfter(openTime.plusMinutes(30));
            boolean afterClosing60Min = nowTime.isAfter(closeTime.plusMinutes(60));

            if (!afterOpening30Min && !afterClosing60Min) continue;

            // 매장의 활성 직원 조회
            List<EmployeeStoreRelation> relations =
                    employeeStoreRelationRepository.findByStoreAndIsActiveTrue(store);

            LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
            LocalDateTime endOfDay = startOfDay.plusDays(1);
            List<Attendance> today_attendances =
                    attendanceRepository.findByStoreAndDate(store, startOfDay, endOfDay);

            for (EmployeeStoreRelation rel : relations) {
                if (rel.getEmployeeProfile() == null) continue;
                User emp = rel.getEmployeeProfile().getUser();
                if (emp == null) continue;

                Optional<Attendance> myToday = today_attendances.stream()
                        .filter(a -> a.getEmployeeProfile().getId().equals(rel.getEmployeeProfile().getId()))
                        .findFirst();

                if (afterClosing60Min && myToday.isPresent() && myToday.get().getCheckOutTime() == null) {
                    // 퇴근 누락 — 직원 + 사장
                    log.info("퇴근 누락 감지 store={} emp={}", store.getId(), emp.getId());
                    notificationService.notifyAttendanceMissing(emp.getId(), store.getStoreName());
                    notifyMastersOfStore(store);
                    missingCount++;
                } else if (afterOpening30Min && myToday.isEmpty()) {
                    // 출근 누락 — 직원 + 사장
                    log.info("출근 누락 감지 store={} emp={}", store.getId(), emp.getId());
                    notificationService.notifyAttendanceMissing(emp.getId(), store.getStoreName());
                    notifyMastersOfStore(store);
                    missingCount++;
                }
            }
        }

        if (missingCount > 0) {
            log.info("AttendanceMissingScheduler: {}건 알림 발송", missingCount);
        }
    }

    /** 같은 매장의 사장(MASTER) 들에게도 동일 알림. */
    private void notifyMastersOfStore(Store store) {
        masterStoreRelationRepository.findByStore(store).forEach(rel -> {
            if (rel.getMasterProfile() == null || rel.getMasterProfile().getUser() == null) return;
            User master = rel.getMasterProfile().getUser();
            notificationService.notifyAttendanceMissing(master.getId(), store.getStoreName());
        });
    }
}
