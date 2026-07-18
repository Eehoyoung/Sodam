package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator;
import com.rich.sodam.core.payroll.wage.WorkHoursCalculator;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceIrregularity;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.AttendanceIrregularityType;
import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffUnit;
import com.rich.sodam.dto.response.TimeOffResponse;
import com.rich.sodam.repository.AttendanceIrregularityRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * 월급제 정규직 지각/조퇴/결근 자동 감지 + 사장 확정(공제확인/공제안함/연차전환).
 *
 * <p><b>중요</b>: 무노동무임금 공제 자체는 이미 {@code PayrollService#calculateMonthlyAttendanceAdjustment}가
 * 정산 시점에 시프트-출퇴근 대조로 자동 계산한다(이 서비스가 생기기 전부터 존재하던 로직). 이 서비스는
 * 그 자동 공제에 사장이 개입할 수 있는 창구를 추가한다 — 감지 자체는 그대로 두되:
 * <ul>
 *   <li>PENDING(기본) — 아무 개입 없음. 자동 공제가 그대로 적용된다.</li>
 *   <li>DEDUCTED — 사장이 자동 공제를 확인만 함(감사 기록용, 금액은 이미 반영되어 있어 추가 계산 없음).</li>
 *   <li>WAIVED — 사장이 공제를 취소. {@link PayrollService}가 해당 날짜의 공제 계산에서 이 건의
 *       미근무시간만큼을 제외하도록 {@link #waivedMinutesByDate} 로 반영한다.</li>
 *   <li>CONVERTED_TO_LEAVE — 연차로 대체. APPROVED TimeOff 를 생성하므로 기존
 *       "승인된 휴가는 결근 공제 제외" 로직을 그대로 타 별도 반영이 필요 없다.</li>
 * </ul></p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceIrregularityService {

    private final AttendanceIrregularityRepository irregularityRepository;
    private final WorkShiftRepository workShiftRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final AttendanceRepository attendanceRepository;
    private final TimeOffRepository timeOffRepository;
    private final PayrollPolicyRepository payrollPolicyRepository;
    private final MonthlySalaryCalculator monthlySalaryCalculator;
    private final WorkHoursCalculator workHoursCalculator;
    private final TimeOffService timeOffService;
    private final NotificationService notificationService;

    /**
     * 매장 조회 시점에 지연 감지 — WorkShiftService.listForStore 의 FixedScheduleService 호출과
     * 같은 "조회하면 최신 상태로 채워짐" 패턴. 오늘 이전에 끝난 확정 시프트만 판정 대상이다
     * (아직 근무 종료 전인 시프트는 판정을 보류).
     */
    @Transactional
    public List<AttendanceIrregularity> listForStore(Long storeId, LocalDate from, LocalDate to) {
        detectForStore(storeId, from, to);
        return irregularityRepository.findByStoreIdAndShiftDateBetweenOrderByShiftDateDesc(storeId, from, to);
    }

    /** 직원 본인 조회용 — 사장이 이미 처리(PENDING 아님)한 건만 노출한다. */
    @Transactional(readOnly = true)
    public List<AttendanceIrregularity> listResolvedForEmployee(Long employeeId, Long storeId) {
        return irregularityRepository.findByEmployeeIdAndStoreIdAndResolutionNotOrderByShiftDateDesc(
                employeeId, storeId, com.rich.sodam.domain.type.AttendanceIrregularityResolution.PENDING);
    }

    /**
     * 정산 반영용 — WAIVED(공제 없이 처리) 건의 날짜별 미근무시간(분) 합.
     * {@link PayrollService}의 자동 근태 공제 계산이 이 시간만큼을 공제 대상에서 제외한다.
     *
     * <p>DEDUCTED 는 이미 {@link PayrollService}가 시프트-출퇴근 대조로 자동 공제하는 금액을
     * 사장이 확인만 한 것이므로 별도 반영이 필요 없고, CONVERTED_TO_LEAVE 는 연차 전환 시 생성되는
     * APPROVED TimeOff 가 기존 결근 공제 제외 로직({@code PayrollService#approvedTimeOffDates})을
     * 그대로 타므로 여기서 다룰 필요가 없다 — WAIVED 만 이 메서드로 별도 보정한다.</p>
     */
    @Transactional(readOnly = true)
    public Map<LocalDate, Integer> waivedMinutesByDate(Long employeeId, Long storeId, LocalDate from, LocalDate to) {
        return irregularityRepository.findByEmployeeIdAndStoreIdAndShiftDateBetweenAndResolution(
                        employeeId, storeId, from, to, com.rich.sodam.domain.type.AttendanceIrregularityResolution.WAIVED)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        AttendanceIrregularity::getShiftDate, AttendanceIrregularity::getMinutesShort, Integer::sum));
    }

    @Transactional
    void detectForStore(Long storeId, LocalDate from, LocalDate to) {
        LocalDate detectTo = to.isAfter(LocalDate.now()) ? LocalDate.now() : to;
        if (detectTo.isBefore(from)) {
            return;
        }
        List<WorkShift> shifts = workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(storeId, from, detectTo);
        LocalDateTime now = LocalDateTime.now();
        for (WorkShift shift : shifts) {
            try {
                detectForShift(shift, now);
            } catch (Exception e) {
                // 시프트 단위 격리 — 개별 데이터 이상으로 배치 전체가 죽지 않게 한다(OwnerReminderScheduler 패턴).
                log.warn("근태 이상 감지 실패 shiftId={} reason={}", shift.getId(), e.getMessage());
            }
        }
    }

    private void detectForShift(WorkShift shift, LocalDateTime now) {
        Optional<EmployeeStoreRelation> relationOpt =
                relationRepository.findRelation(shift.getEmployeeId(), shift.getStoreId());
        if (relationOpt.isEmpty() || !relationOpt.get().isMonthlySalaried()) {
            return; // 시급제는 실근로시간만큼만 지급되어 별도 공제 개념이 필요 없다 — 월급제만 대상.
        }

        LocalDateTime scheduledStart = shift.getShiftDate().atTime(shift.getStartTime());
        LocalDateTime scheduledEnd = shift.crossesMidnight()
                ? shift.getShiftDate().plusDays(1).atTime(shift.getEndTime())
                : shift.getShiftDate().atTime(shift.getEndTime());
        if (now.isBefore(scheduledEnd)) {
            return; // 아직 근무가 끝나지 않음 — 판정 보류
        }

        if (timeOffRepository.existsApprovedCoveringDate(shift.getEmployeeId(), shift.getStoreId(), shift.getShiftDate())) {
            return; // 승인된 휴가로 이미 덮인 날 — 결근 아님
        }

        List<Attendance> attendances = attendanceRepository.findByEmployeeIdAndStoreIdAndPeriodWithDetails(
                shift.getEmployeeId(), shift.getStoreId(),
                shift.getShiftDate().atStartOfDay(), shift.getShiftDate().atTime(23, 59, 59));

        Optional<Attendance> earliest = attendances.stream().min(Comparator.comparing(Attendance::getCheckInTime));
        if (earliest.isEmpty()) {
            // PayrollService#calculateMonthlyAttendanceAdjustment 와 동일 기준(휴게시간 공제 후,
            // 일 소정근로시간 캡)으로 맞춰 사장에게 보여주는 예상 공제액이 실제 정산액과 일치하게 한다.
            double regularHoursPerDay = payrollPolicyRepository.findByStore_Id(shift.getStoreId())
                    .map(PayrollPolicy::getRegularHoursPerDay).orElse(8.0);
            double paidHours = Math.min(
                    workHoursCalculator.calculate(scheduledStart, scheduledEnd, regularHoursPerDay).paidHours(),
                    regularHoursPerDay);
            int minutes = (int) Math.round(paidHours * 60);
            recordIfAbsent(shift, null, AttendanceIrregularityType.ABSENCE, minutes);
            return;
        }

        Attendance attendance = earliest.get();
        if (attendance.getCheckInTime().isAfter(scheduledStart)) {
            int lateMinutes = (int) Duration.between(scheduledStart, attendance.getCheckInTime()).toMinutes();
            if (lateMinutes > 0) {
                recordIfAbsent(shift, attendance.getId(), AttendanceIrregularityType.LATE, lateMinutes);
            }
        }
        if (attendance.getCheckOutTime() != null && attendance.getCheckOutTime().isBefore(scheduledEnd)) {
            int earlyMinutes = (int) Duration.between(attendance.getCheckOutTime(), scheduledEnd).toMinutes();
            if (earlyMinutes > 0) {
                recordIfAbsent(shift, attendance.getId(), AttendanceIrregularityType.EARLY_LEAVE, earlyMinutes);
            }
        }
    }

    private void recordIfAbsent(WorkShift shift, Long attendanceId, AttendanceIrregularityType type, int minutes) {
        if (irregularityRepository.existsByWorkShiftIdAndType(shift.getId(), type)) {
            return; // 이미 감지(또는 사장이 이미 처리)된 건 — 재생성하지 않음
        }
        irregularityRepository.save(AttendanceIrregularity.detect(
                shift.getEmployeeId(), shift.getStoreId(), shift.getId(), attendanceId, shift.getShiftDate(), type, minutes));
    }

    @Transactional
    public AttendanceIrregularity waive(Long id, Long storeId, Long masterId, String note) {
        AttendanceIrregularity a = getInStore(id, storeId);
        a.waive(masterId, note);
        AttendanceIrregularity saved = irregularityRepository.save(a);
        notifyEmployee(saved, "공제 없이 처리됐어요.");
        return saved;
    }

    /**
     * 자동 공제 확인(감사 기록용). {@link PayrollService}가 이미 같은 통상시급 기준으로 자동 공제하므로
     * 여기서 계산·저장하는 금액은 급여에 추가 반영되지 않는다 — "사장이 사유를 검토하고 그대로 두기로
     * 했다"는 기록만 남긴다.
     */
    @Transactional
    public AttendanceIrregularity deduct(Long id, Long storeId, Long masterId, String note) {
        AttendanceIrregularity a = getInStore(id, storeId);
        EmployeeStoreRelation relation = relationRepository.findRelation(a.getEmployeeId(), a.getStoreId())
                .orElseThrow(() -> new NoSuchElementException("직원-매장 관계를 찾을 수 없어요."));
        if (!relation.isMonthlySalaried()) {
            throw new IllegalStateException("월급제 직원만 근태 공제를 적용할 수 있어요.");
        }
        PayrollPolicy policy = payrollPolicyRepository.findByStore(relation.getStore())
                .orElseThrow(() -> new NoSuchElementException("급여 정책을 찾을 수 없어요."));
        int hourlyWage = monthlySalaryCalculator.ordinaryHourlyWage(relation.getMonthlySalary(),
                relation.getContractedWeeklyHours(), relation.getContractedWeeklyDays(),
                policy.getRegularHoursPerDay());
        int amount = (int) Math.round(hourlyWage * (a.getMinutesShort() / 60.0));

        a.deduct(masterId, amount, note);
        AttendanceIrregularity saved = irregularityRepository.save(a);
        notifyEmployee(saved, String.format("%,d원이 공제됐어요.", amount));
        return saved;
    }

    /**
     * 연차(반차/종일)로 소급 전환 — 무급공제 대신 연차 잔여를 차감한다. 지각·조퇴는 반차,
     * 결근은 종일로 전환한다. {@link TimeOffService}의 잔여 검증·중복 신청 방지 로직을 그대로 탄다.
     */
    @Transactional
    public AttendanceIrregularity convertToLeave(Long id, Long storeId, Long masterId, String note) {
        AttendanceIrregularity a = getInStore(id, storeId);
        TimeOffUnit unit = a.getType() == AttendanceIrregularityType.ABSENCE ? TimeOffUnit.FULL_DAY : TimeOffUnit.HALF_DAY;
        TimeOffResponse timeOff = timeOffService.createTimeOffRequest(
                a.getEmployeeId(), a.getStoreId(), TimeOffLeaveType.ANNUAL, unit,
                a.getShiftDate(), a.getShiftDate(), null, null,
                "근태 이상 연차 전환(" + a.getType() + ")");
        timeOffService.approveTimeOffRequest(timeOff.id());

        a.convertToLeave(masterId, note);
        AttendanceIrregularity saved = irregularityRepository.save(a);
        notifyEmployee(saved, "연차로 대체 처리됐어요.");
        return saved;
    }

    private AttendanceIrregularity getInStore(Long id, Long storeId) {
        return irregularityRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> new NoSuchElementException("근태 이상 건을 찾을 수 없어요."));
    }

    private void notifyEmployee(AttendanceIrregularity a, String resultText) {
        String typeLabel = switch (a.getType()) {
            case LATE -> "지각";
            case EARLY_LEAVE -> "조퇴";
            case ABSENCE -> "결근";
        };
        notificationService.push(a.getEmployeeId(), PushMessage.builder()
                .title("근태 처리 안내")
                .body(String.format("%s (%s) 건이 처리됐어요. %s", a.getShiftDate(), typeLabel, resultText))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_IRREGULARITY_RESOLVED"))
                .build());
    }
}
