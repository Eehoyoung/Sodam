package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.WageHistory;
import com.rich.sodam.dto.response.EvidencePackageResponse;
import com.rich.sodam.dto.response.EvidencePackageResponse.AttendanceSummary;
import com.rich.sodam.dto.response.EvidencePackageResponse.ContractSummary;
import com.rich.sodam.dto.response.EvidencePackageResponse.PayrollSummary;
import com.rich.sodam.dto.response.EvidencePackageResponse.WageHistoryLine;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.WageHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 근무 증거 패키지 집계 (L-NEW-05).
 *
 * <p>한 직원의 근태·급여·계약·시급이력을 한 기간 기준으로 묶는다(임금체불 진정 대비 셀프 증거).
 * <b>신규 엔티티 없이</b> 기존 기록만 집계한다. 사장 전용.
 *
 * <p>PII 안전선: 이름·내부ID까지만 다룬다. 주민번호·계좌번호는 조회·반환하지 않는다.
 * 면책({@link #DISCLAIMER})을 항상 동반한다.
 */
@Service
@RequiredArgsConstructor
public class EvidencePackageService {

    static final String DISCLAIMER =
            "참고용 자료예요. 법적 제출(노동청 진정 등) 전에는 빠진 항목을 보완하고, "
                    + "주민번호 등 신분 정보는 직접 추가해 주세요. 금액·근로시간은 기록 기준 추정이라 실제와 다를 수 있어요.";

    private final EmployeeProfileRepository employeeProfileRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;
    private final LaborContractService laborContractService;
    private final WageHistoryRepository wageHistoryRepository;

    @Transactional(readOnly = true)
    public EvidencePackageResponse forEmployee(Long storeId, Long employeeId, LocalDate from, LocalDate to) {
        String employeeName = resolveName(employeeId);

        AttendanceSummary attendance = attendanceSummary(employeeId, storeId, from, to);
        PayrollSummary payroll = payrollSummary(employeeId, from, to);
        ContractSummary contract = contractSummary(employeeId, storeId);
        List<WageHistoryLine> wageHistory = wageHistory(employeeId, storeId);

        return new EvidencePackageResponse(
                storeId, employeeId, employeeName, from, to,
                attendance, payroll, contract, wageHistory, DISCLAIMER);
    }

    private String resolveName(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .map(EmployeeProfile::getUser)
                .map(u -> u != null ? u.getName() : null)
                .filter(n -> n != null && !n.isBlank())
                .orElse("(이름 미상)");
    }

    private AttendanceSummary attendanceSummary(Long employeeId, Long storeId, LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);
        List<Attendance> records = attendanceRepository
                .findByEmployeeIdAndStoreIdAndPeriodWithDetails(employeeId, storeId, start, end);

        Set<LocalDate> days = new HashSet<>();
        long totalMinutes = 0;
        for (Attendance a : records) {
            if (a.getCheckInTime() != null) {
                days.add(a.getCheckInTime().toLocalDate());
            }
            // 퇴근 처리된 기록만 근로시간으로 집계(미퇴근은 길이 불명)
            totalMinutes += a.getWorkingTimeInMinutes();
        }
        double hours = Math.round(totalMinutes / 60.0 * 10.0) / 10.0;
        return new AttendanceSummary(days.size(), records.size(), totalMinutes, hours);
    }

    private PayrollSummary payrollSummary(Long employeeId, LocalDate from, LocalDate to) {
        List<Payroll> rows = payrollRepository.findByEmployeeIdAndPeriod(employeeId, from, to);
        long gross = 0;
        long net = 0;
        long deduction = 0;
        for (Payroll p : rows) {
            gross += nz(p.getGrossWage());
            net += nz(p.getNetWage());
            deduction += nz(p.getTaxAmount()) + nz(p.getDeductions());
        }
        return new PayrollSummary(rows.size(), gross, net, deduction);
    }

    private ContractSummary contractSummary(Long employeeId, Long storeId) {
        List<LaborContract> contracts = laborContractService.findFor(employeeId, storeId);
        if (contracts.isEmpty()) {
            return new ContractSummary(false, null, null, null, null, null, false);
        }
        // findFor 는 최신순 — 가장 최근 계약을 대표로 사용
        LaborContract c = contracts.get(0);
        return new ContractSummary(
                true,
                c.getHourlyWage(),
                c.getContractedHoursPerWeek(),
                c.getWeeklyHolidayDay(),
                c.getStartDate(),
                c.getEndDate(),
                c.isSigned());
    }

    private List<WageHistoryLine> wageHistory(Long employeeId, Long storeId) {
        List<WageHistory> merged = new ArrayList<>();
        // 직원 개별 시급 변경분
        merged.addAll(wageHistoryRepository
                .findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(employeeId, storeId));
        // 직원에게 적용되는 매장 기본 시급 변경분
        merged.addAll(wageHistoryRepository
                .findByScopeAndStore_IdInOrderByEffectiveFromDesc(
                        WageHistory.Scope.STORE_DEFAULT, List.of(storeId)));

        return merged.stream()
                .sorted(Comparator.comparing(WageHistory::getEffectiveFrom).reversed())
                .map(w -> new WageHistoryLine(
                        w.getScope().name(),
                        w.getHourlyWage(),
                        w.getEffectiveFrom(),
                        w.getReason()))
                .toList();
    }

    private static long nz(Integer v) {
        return v != null ? v : 0;
    }
}
