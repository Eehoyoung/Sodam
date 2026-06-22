package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.EmployeeRosterResponse;
import com.rich.sodam.dto.response.EmployeeRosterResponse.RosterLine;
import com.rich.sodam.dto.response.WageLedgerResponse;
import com.rich.sodam.dto.response.WageLedgerResponse.WageLine;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 법정 장부 자료 집계 (B8/L-NEW-03).
 *
 * <p>임금대장(근로기준법 §48①)·근로자명부(§41) — 근로감독·체불진정 1순위 요구 서류.
 * 보유 데이터({@link Payroll}·{@link EmployeeStoreRelation})로 직원별 항목을 산출한다.
 * <b>자료정리까지만</b> — 법정 서식 자체는 사장이 보완. 주민번호 미저장(이름+내부ID까지만).
 */
@Service
@RequiredArgsConstructor
public class LegalLedgerService {

    static final String WAGE_DISCLAIMER =
            "참고용 자료예요. 근로감독·진정 대응 시 임금대장 법정 서식(근로기준법 §48①)으로 보완이 필요할 수 있어요.";
    static final String ROSTER_DISCLAIMER =
            "참고용 자료예요. 근로자명부 법정 서식(근로기준법 §41)에는 주소·종사업무 등 추가 기재가 필요하고, 주민번호는 직접 보완해 주세요.";

    private static final String UNKNOWN_NAME = "(이름 미상)";

    private final PayrollRepository payrollRepository;
    private final EmployeeStoreRelationRepository relationRepository;

    /**
     * 임금대장 — 그 달 매장 직원별 급여 항목 합산(§48①).
     */
    @Transactional(readOnly = true)
    public WageLedgerResponse wageLedger(Long storeId, int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        List<Payroll> rows = payrollRepository.findByStoreIdAndPeriod(storeId, from, to);

        // 인별 누적: 입력 순서 보존 위해 LinkedHashMap
        Map<Long, long[]> agg = new LinkedHashMap<>();   // [regular, overtime, night, holiday, weekly, gross, deduction, net]
        Map<Long, String> names = new LinkedHashMap<>();

        for (Payroll p : rows) {
            if (p.getEmployee() == null) {
                continue;
            }
            Long eid = p.getEmployee().getId();
            long[] acc = agg.computeIfAbsent(eid, k -> new long[8]);
            acc[0] += nz(p.getRegularWage());
            acc[1] += nz(p.getOvertimeWage());
            acc[2] += nz(p.getNightWorkWage());
            acc[3] += nz(p.getHolidayWorkWage());
            acc[4] += nz(p.getWeeklyAllowance());
            acc[5] += nz(p.getGrossWage());
            acc[6] += deductionOf(p);
            acc[7] += nz(p.getNetWage());
            names.putIfAbsent(eid, employeeName(p.getEmployee()));
        }

        List<WageLine> items = new ArrayList<>();
        long totalGross = 0;
        long totalDeduction = 0;
        long totalNet = 0;
        for (Map.Entry<Long, long[]> e : agg.entrySet()) {
            long[] v = e.getValue();
            items.add(new WageLine(
                    e.getKey(), names.get(e.getKey()),
                    v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]));
            totalGross += v[5];
            totalDeduction += v[6];
            totalNet += v[7];
        }

        return new WageLedgerResponse(
                storeId, year, month, items.size(),
                totalGross, totalDeduction, totalNet, items, WAGE_DISCLAIMER);
    }

    /**
     * 근로자명부 — 매장 직원별 이름·입사일·시급·재직상태(§41).
     */
    @Transactional(readOnly = true)
    public EmployeeRosterResponse employeeRoster(Long storeId) {
        List<EmployeeStoreRelation> relations = relationRepository.findByStore_Id(storeId);

        List<RosterLine> items = new ArrayList<>();
        for (EmployeeStoreRelation rel : relations) {
            EmployeeProfile emp = rel.getEmployeeProfile();
            Long eid = emp != null ? emp.getId() : null;
            items.add(new RosterLine(
                    eid,
                    employeeName(emp),
                    rel.getHireDate(),
                    appliedWage(rel),
                    Boolean.TRUE.equals(rel.getIsActive())));
        }

        return new EmployeeRosterResponse(storeId, items.size(), items, ROSTER_DISCLAIMER);
    }

    /** 공제 총액 = 원천징수세액(taxAmount) + 기타 공제(deductions). null 안전. */
    private long deductionOf(Payroll p) {
        return nz(p.getTaxAmount()) + nz(p.getDeductions());
    }

    /** 적용 시급: 개별 시급 우선, 매장 기준 시급 사용 시 매장 표준 시급. 매장 미연결 등 예외 시 null. */
    private Integer appliedWage(EmployeeStoreRelation rel) {
        try {
            if (Boolean.FALSE.equals(rel.getUseStoreStandardWage()) && rel.getCustomHourlyWage() != null) {
                return rel.getCustomHourlyWage();
            }
            return rel.getStore() != null ? rel.getStore().getStoreStandardHourWage() : rel.getCustomHourlyWage();
        } catch (RuntimeException ex) {
            return rel.getCustomHourlyWage();
        }
    }

    private long nz(Integer v) {
        return v != null ? v : 0L;
    }

    private String employeeName(EmployeeProfile emp) {
        if (emp != null && emp.getUser() != null && emp.getUser().getName() != null) {
            return emp.getUser().getName();
        }
        return UNKNOWN_NAME;
    }
}
