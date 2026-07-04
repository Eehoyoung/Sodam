package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.AttendanceApprovalRequest;
import com.rich.sodam.domain.PayrollCycle;
import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.ReminderType;
import com.rich.sodam.repository.AttendanceApprovalRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.DailySalesRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.ReminderLogRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * 사장 리마인더 배치 5종.
 * <ol>
 *   <li>(a) 마감 30분 전 — 오늘 매출 미입력 시 "오늘 매출을 입력해 주세요" (10분 주기, [마감-30, 마감-20) 윈도)</li>
 *   <li>(b) 오픈 후 첫 윈도 — 어제(영업일) 매출 미입력 시 재알림 (10분 주기)</li>
 *   <li>(c) 급여일 D-3 — 매일 09:00, 지급일 3일 전 매장 사장에게</li>
 *   <li>(d) 주간 리포트 — 매주 월요일 09:00, 지난주 요약 딥링크</li>
 *   <li>(e) 지각·미출근 감지 — 10분 주기, 확정 시프트 시작 +10분 경과에도 출근 기록 없으면 사장에게</li>
 * </ol>
 *
 * <p><b>멱등성</b>: {@link ReminderLog} (store_id, reminder_type, target_date, ref_id) 유니크 —
 * 발송 전 존재 체크, 발송 후 기록. 같은 날 배치가 재실행돼도 중복 발송하지 않는다.
 * 기존 룰은 ref_id=NULL, 지각 감지는 ref_id=시프트 ID 로 직원(시프트)별 멱등성을 확보한다.
 * <p>푸시는 {@link NotificationService} 재사용(인앱 inbox 적재 + FCM). FCM 키 없는 dev 환경에서도
 * 배치가 죽지 않도록 매장 단위 try-catch 로 격리한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerReminderScheduler {

    /** 마감 전 알림 윈도 시작(분). [마감-30, 마감-20) 에 현재 시각이 들어오면 발송. */
    private static final int CLOSE_WINDOW_START_MIN = 30;
    private static final int CLOSE_WINDOW_END_MIN = 20;
    /** 급여일 알림 리드타임(일). */
    private static final int PAYDAY_LEAD_DAYS = 3;
    /** 지각 감지 유예(분) — 시프트 시작 후 이 시간까지는 출근 대기로 본다. */
    private static final int LATE_GRACE_MINUTES = 10;

    private final StoreRepository storeRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final DailySalesRepository dailySalesRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final NotificationService notificationService;
    private final WorkShiftRepository workShiftRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceApprovalRequestRepository attendanceApprovalRequestRepository;
    private final UserRepository userRepository;

    /* ==================== (a)+(b) 매출 입력 리마인더 — 10분 주기 ==================== */

    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Seoul")
    @Transactional
    public void remindSalesInput() {
        remindSalesInput(LocalDateTime.now());
    }

    /** 시각 주입 가능 버전(테스트용). */
    void remindSalesInput(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        for (Store store : storeRepository.findAll()) {
            try {
                if (!store.isActive() || store.getOperatingHours() == null) continue;
                remindTodayBeforeClose(store, now, today);
                remindYesterdayAfterOpen(store, now, today);
            } catch (Exception e) {
                // 매장 단위 격리 — FCM 미설정/데이터 이상으로 배치 전체가 죽지 않게 한다.
                log.warn("매출 리마인더 처리 실패 storeId={} reason={}", store.getId(), e.getMessage());
            }
        }
    }

    /** (a) 오늘 마감 30분 전 — 오늘 매출 미입력이면 알림. 휴무일 스킵. */
    private void remindTodayBeforeClose(Store store, LocalDateTime now, LocalDate today) {
        DayOfWeek dow = today.getDayOfWeek();
        if (!store.getOperatingHours().isOpenOn(dow)) return;
        LocalTime close = store.getOperatingHours().getCloseTime(dow);
        if (close == null) return;

        long minutesToClose = ChronoUnit.MINUTES.between(now.toLocalTime(), close);
        // [마감-30, 마감-20) 윈도: 남은 시간이 (20, 30] 분
        if (minutesToClose <= CLOSE_WINDOW_END_MIN || minutesToClose > CLOSE_WINDOW_START_MIN) return;
        if (dailySalesRepository.existsByStoreIdAndSaleDate(store.getId(), today)) return;

        sendOnce(store, ReminderType.SALES_CLOSE_REMINDER, today, PushMessage.builder()
                .title("오늘 매출을 입력해 주세요")
                .body(String.format("%s 마감 30분 전이에요. 오늘 매출을 입력하면 인건비율을 바로 볼 수 있어요.",
                        store.getStoreName()))
                .deepLink("sodam://daily-sales")
                .data(Map.of("type", "SALES_CLOSE_REMINDER", "storeId", String.valueOf(store.getId())))
                .build());
    }

    /** (b) 오늘 오픈 이후 — 어제가 영업일인데 매출 미입력이면 재알림. */
    private void remindYesterdayAfterOpen(Store store, LocalDateTime now, LocalDate today) {
        LocalDate yesterday = today.minusDays(1);
        // 어제가 휴무였으면 매출이 없는 게 정상 — 스킵
        if (!store.getOperatingHours().isOpenOn(yesterday.getDayOfWeek())) return;
        // 오늘 오픈 시각 이후 첫 윈도에서만 (오늘 휴무면 스킵 — 다음 영업일에 확인)
        DayOfWeek dow = today.getDayOfWeek();
        if (!store.getOperatingHours().isOpenOn(dow)) return;
        LocalTime open = store.getOperatingHours().getOpenTime(dow);
        if (open == null || now.toLocalTime().isBefore(open)) return;
        if (dailySalesRepository.existsByStoreIdAndSaleDate(store.getId(), yesterday)) return;

        sendOnce(store, ReminderType.SALES_YESTERDAY_REMINDER, yesterday, PushMessage.builder()
                .title("어제 매출이 아직 입력되지 않았어요")
                .body(String.format("%s의 어제(%s) 매출을 입력해 주세요.", store.getStoreName(), yesterday))
                .deepLink("sodam://daily-sales")
                .data(Map.of("type", "SALES_YESTERDAY_REMINDER", "storeId", String.valueOf(store.getId()),
                        "targetDate", yesterday.toString()))
                .build());
    }

    /* ==================== (c) 급여일 D-3 — 매일 09:00 ==================== */

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    @Transactional
    public void remindPaydayD3() {
        remindPaydayD3(LocalDate.now());
    }

    /** 날짜 주입 가능 버전(테스트용). */
    void remindPaydayD3(LocalDate today) {
        LocalDate target = today.plusDays(PAYDAY_LEAD_DAYS);
        for (Store store : storeRepository.findAll()) {
            try {
                if (!store.isActive()) continue;
                PayrollCycle cycle = store.getPayrollCycle();
                if (cycle == null || !cycle.isConfigured()) continue;
                if (!isPayDate(cycle, target)) continue;

                sendOnce(store, ReminderType.PAYDAY_D3, target, PushMessage.builder()
                        .title("3일 뒤 급여일입니다")
                        .body(String.format("%s의 급여일(%s)이 3일 남았어요. 급여 정산을 미리 준비해 보세요.",
                                store.getStoreName(), target))
                        .deepLink("sodam://payroll")
                        .data(Map.of("type", "PAYDAY_D3", "storeId", String.valueOf(store.getId()),
                                "payDate", target.toString()))
                        .build());
            } catch (Exception e) {
                log.warn("급여일 D-3 리마인더 처리 실패 storeId={} reason={}", store.getId(), e.getMessage());
            }
        }
    }

    /** target 날짜가 이 매장의 급여 지급일인지 — 인접 기준월(전월/당월/익월) 후보로 판정. */
    boolean isPayDate(PayrollCycle cycle, LocalDate target) {
        YearMonth base = YearMonth.from(target);
        for (YearMonth candidate : List.of(base.minusMonths(1), base, base.plusMonths(1))) {
            if (target.equals(cycle.resolvePayDate(candidate))) {
                return true;
            }
        }
        return false;
    }

    /* ==================== (d) 주간 리포트 — 매주 월요일 09:00 ==================== */

    @Scheduled(cron = "0 0 9 * * MON", zone = "Asia/Seoul")
    @Transactional
    public void remindWeeklyReport() {
        remindWeeklyReport(LocalDate.now());
    }

    /** 날짜 주입 가능 버전(테스트용). */
    void remindWeeklyReport(LocalDate today) {
        LocalDate lastWeekStart = today.minusDays(7); // 지난주 월요일
        for (Store store : storeRepository.findAll()) {
            try {
                if (!store.isActive()) continue;
                sendOnce(store, ReminderType.WEEKLY_REPORT, today, PushMessage.builder()
                        .title("주간 리포트가 도착했어요")
                        .body(String.format("%s의 지난주 매장 활동 요약을 확인해 보세요.", store.getStoreName()))
                        .deepLink("sodam://weekly-insights")
                        // WeeklyInsights 화면 딥링크용 데이터 키
                        .data(Map.of("type", "WEEKLY_REPORT", "storeId", String.valueOf(store.getId()),
                                "weekStart", lastWeekStart.toString(),
                                "weekEnd", lastWeekStart.plusDays(6).toString()))
                        .build());
            } catch (Exception e) {
                log.warn("주간 리포트 리마인더 처리 실패 storeId={} reason={}", store.getId(), e.getMessage());
            }
        }
    }

    /* ==================== (e) 지각·미출근 감지 — 10분 주기 ==================== */

    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Seoul")
    @Transactional
    public void remindLateCheckIn() {
        remindLateCheckIn(LocalDateTime.now());
    }

    /**
     * 시각 주입 가능 버전(테스트용).
     *
     * <p>오늘의 <b>확정</b> 시프트 중 시작 +{@value LATE_GRACE_MINUTES}분이 지났는데 그 직원의
     * 해당 매장 출근(check-in) 기록이 없으면 사장에게 알린다.
     * 승인 대기(AttendanceApprovalRequest PENDING CHECK_IN)가 있으면 사장이 이미 인지한 상태이므로 스킵.
     * 멱등키 ref_id=시프트 ID — 같은 날 같은 매장이라도 직원(시프트)별로 각각 1회 발송.
     */
    void remindLateCheckIn(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        for (WorkShift shift : workShiftRepository.findByShiftDateAndConfirmedAtIsNotNull(today)) {
            try {
                LocalDateTime lateThreshold = shift.getShiftDate()
                        .atTime(shift.getStartTime()).plusMinutes(LATE_GRACE_MINUTES);
                if (!now.isAfter(lateThreshold)) continue; // 아직 유예 시간 내

                // 오늘 그 매장에 출근 기록이 있으면 정상 출근
                if (attendanceRepository.existsByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetween(
                        shift.getEmployeeId(), shift.getStoreId(),
                        today.atStartOfDay(), today.plusDays(1).atStartOfDay())) continue;

                // 사장 승인 대기 중이면 사장이 이미 인지 — 중복 알림 스킵
                if (attendanceApprovalRequestRepository.existsByEmployeeIdAndStoreIdAndTypeAndStatus(
                        shift.getEmployeeId(), shift.getStoreId(),
                        AttendanceApprovalRequest.Type.CHECK_IN, AttendanceApprovalRequest.Status.PENDING)) continue;

                Store store = storeRepository.findById(shift.getStoreId()).orElse(null);
                if (store == null || !store.isActive()) continue;

                String employeeName = userRepository.findById(shift.getEmployeeId())
                        .map(User::getName).orElse("직원");
                sendOnce(store, ReminderType.SHIFT_LATE, today, shift.getId(), PushMessage.builder()
                        .title("아직 출근 전이에요")
                        .body(String.format("%s님이 아직 출근 전이에요(%s 예정).", employeeName, shift.getStartTime()))
                        .deepLink("sodam://attendance")
                        .data(Map.of("type", "SHIFT_LATE", "storeId", String.valueOf(store.getId()),
                                "shiftId", String.valueOf(shift.getId()),
                                "employeeId", String.valueOf(shift.getEmployeeId())))
                        .build());
            } catch (Exception e) {
                // 시프트 단위 격리 — 개별 데이터 이상으로 배치 전체가 죽지 않게 한다.
                log.warn("지각 감지 처리 실패 shiftId={} reason={}", shift.getId(), e.getMessage());
            }
        }
    }

    /* ==================== 공통 ==================== */

    /**
     * 멱등 발송 — reminder_log 에 (store, type, targetDate) 가 없을 때만 매장 사장들에게 발송 후 기록.
     * 푸시 실패(FCM 키 없음 등)해도 예외를 삼켜 배치를 계속 진행한다.
     *
     * @return 실제 발송했으면 true (이미 발송된 건은 false)
     */
    boolean sendOnce(Store store, ReminderType type, LocalDate targetDate, PushMessage message) {
        return sendOnce(store, type, targetDate, null, message);
    }

    /**
     * 멱등 발송(refId 확장) — (store, type, targetDate, refId) 단위로 1회만 발송.
     * refId=NULL 인 기존 룰은 기존 3컬럼 체크와 동작이 같다(SHIFT_LATE 는 refId=시프트 ID).
     */
    boolean sendOnce(Store store, ReminderType type, LocalDate targetDate, Long refId, PushMessage message) {
        boolean alreadySent = (refId == null)
                ? reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(store.getId(), type, targetDate)
                : reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDateAndRefId(
                        store.getId(), type, targetDate, refId);
        if (alreadySent) {
            return false;
        }
        // 발송 기록 먼저 저장 — 유니크 제약이 동시 실행(멀티 인스턴스) 중복도 차단한다.
        reminderLogRepository.save(new ReminderLog(store.getId(), type, targetDate, refId));

        masterStoreRelationRepository.findByStore(store).forEach(rel -> {
            if (rel.getMasterProfile() == null || rel.getMasterProfile().getUser() == null) return;
            User master = rel.getMasterProfile().getUser();
            try {
                notificationService.push(master.getId(), message);
            } catch (Exception e) {
                log.warn("리마인더 푸시 실패 userId={} type={} reason={}", master.getId(), type, e.getMessage());
            }
        });
        log.info("사장 리마인더 발송 storeId={} type={} targetDate={}", store.getId(), type, targetDate);
        return true;
    }
}
