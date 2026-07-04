package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.AttendanceWorkLogResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.PayrollBonusRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AttendanceWorkLogService {

    private final AttendanceRepository attendanceRepository;
    private final PayrollBonusRepository payrollBonusRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public AttendanceWorkLogResponse getMonthlyWorkLog(Long employeeId, Long storeId, int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month must be between 1 and 12: " + month);
        }

        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        LocalDateTime startOfMonth = DateTimeUtils.getStartOfMonth(year, month);
        LocalDateTime endOfMonth = DateTimeUtils.getEndOfMonth(year, month);

        List<Attendance> attendances = attendanceRepository.findByEmployeeIdAndStoreIdAndPeriodWithDetails(
                employeeId, storeId, startOfMonth, endOfMonth);
        List<PayrollBonus> bonuses = payrollBonusRepository.findByEmployeeIdAndStoreIdAndBonusDateBetweenOrderByBonusDateDesc(
                employeeId, storeId, from, to);

        Map<LocalDate, BonusBucket> bonusByDate = new LinkedHashMap<>();
        for (PayrollBonus bonus : bonuses) {
            bonusByDate.computeIfAbsent(bonus.getBonusDate(), ignored -> new BonusBucket())
                    .add(bonus.getAmount(), bonus.getReason());
        }

        List<AttendanceWorkLogResponse.Row> rows = new ArrayList<>();
        int totalWorkedMinutes = 0;
        int totalDailyWage = 0;
        int totalBonusAmount = 0;

        for (Attendance attendance : attendances) {
            LocalDate date = attendance.getCheckInTime().toLocalDate();
            int workedMinutes = Math.toIntExact(attendance.getWorkingTimeInMinutes());
            Integer dailyWage = attendance.getCheckOutTime() != null && attendance.getAppliedHourlyWage() != null
                    ? attendance.calculateDailyWage()
                    : null;
            BonusBucket bonus = bonusByDate.remove(date);
            int bonusAmount = bonus != null ? bonus.amount : 0;

            totalWorkedMinutes += workedMinutes;
            totalDailyWage += dailyWage != null ? dailyWage : 0;
            totalBonusAmount += bonusAmount;

            rows.add(new AttendanceWorkLogResponse.Row(
                    attendance.getId(),
                    date,
                    attendance.getCheckInTime(),
                    attendance.getCheckOutTime(),
                    workedMinutes,
                    attendance.getWorkingTimeInHours(),
                    attendance.getAppliedHourlyWage(),
                    dailyWage,
                    bonusAmount,
                    bonus != null ? bonus.reason() : null,
                    bonus != null && bonus.reason() != null ? bonus.reason() : defaultMemo(attendance),
                    attendance.getCheckOutTime() == null ? "WORKING" : "CONFIRMED"
            ));
        }

        for (Map.Entry<LocalDate, BonusBucket> entry : bonusByDate.entrySet()) {
            BonusBucket bonus = entry.getValue();
            totalBonusAmount += bonus.amount;
            rows.add(new AttendanceWorkLogResponse.Row(
                    null,
                    entry.getKey(),
                    null,
                    null,
                    0,
                    0.0,
                    null,
                    null,
                    bonus.amount,
                    bonus.reason(),
                    bonus.reason() != null ? bonus.reason() : "보너스",
                    "BONUS_ONLY"
            ));
        }

        rows.sort(Comparator.comparing(AttendanceWorkLogResponse.Row::date));
        String storeName = storeRepository.findById(storeId).map(Store::getStoreName).orElse(null);

        return new AttendanceWorkLogResponse(
                employeeId,
                storeId,
                storeName,
                year,
                month,
                new AttendanceWorkLogResponse.Summary(
                        (int) attendances.stream().filter(a -> a.getCheckInTime() != null).count(),
                        totalWorkedMinutes,
                        totalDailyWage,
                        totalBonusAmount,
                        totalDailyWage + totalBonusAmount
                ),
                rows
        );
    }

    private static String defaultMemo(Attendance attendance) {
        return attendance.getCheckOutTime() == null ? "퇴근 전" : "출퇴근 기록";
    }

    private static class BonusBucket {
        private int amount;
        private final List<String> reasons = new ArrayList<>();

        private void add(Integer amount, String reason) {
            this.amount += amount != null ? amount : 0;
            if (reason != null && !reason.isBlank()) {
                reasons.add(reason);
            }
        }

        private String reason() {
            return reasons.isEmpty() ? null : String.join(", ", reasons);
        }
    }
}
