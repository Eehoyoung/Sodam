package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.WithholdingStatementResponse;
import com.rich.sodam.dto.response.WithholdingStatementResponse.EmployeeLine;
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
 * 간이지급명세서 자료 집계 (A2/T-NEW-01).
 *
 * <p>그 해 매장의 급여({@link Payroll}) 데이터를 <b>인별로 합산</b>해 지급총액·원천징수세액을 낸다.
 * 신고·제출은 하지 않는다(홈택스 위임). 주민번호 미저장 — 이름+내부ID까지만.
 */
@Service
@RequiredArgsConstructor
public class WithholdingStatementService {

    static final String DISCLAIMER =
            "참고용 자료예요. 실제 신고 전 세무사 검토가 필요하고, 주민번호 등은 홈택스에서 보완해 주세요.";

    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public WithholdingStatementResponse forYear(Long storeId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        List<Payroll> rows = payrollRepository.findByStoreIdAndPeriod(storeId, from, to);

        // 인별 누적: 입력 순서 보존 위해 LinkedHashMap
        Map<Long, long[]> agg = new LinkedHashMap<>();   // [paid, withheld]
        Map<Long, String> names = new LinkedHashMap<>();

        for (Payroll p : rows) {
            if (p.getEmployee() == null) {
                continue;
            }
            Long eid = p.getEmployee().getId();
            long paid = p.getGrossWage() != null ? p.getGrossWage() : 0;
            long withheld = p.getTaxAmount() != null ? p.getTaxAmount() : 0;

            long[] acc = agg.computeIfAbsent(eid, k -> new long[2]);
            acc[0] += paid;
            acc[1] += withheld;
            names.putIfAbsent(eid, employeeName(p));
        }

        List<EmployeeLine> items = new ArrayList<>();
        long totalPaid = 0;
        long totalWithheld = 0;
        for (Map.Entry<Long, long[]> e : agg.entrySet()) {
            long paid = e.getValue()[0];
            long withheld = e.getValue()[1];
            items.add(new EmployeeLine(e.getKey(), names.get(e.getKey()), paid, withheld));
            totalPaid += paid;
            totalWithheld += withheld;
        }

        return new WithholdingStatementResponse(
                storeId, year, items.size(), totalPaid, totalWithheld, items, DISCLAIMER);
    }

    private String employeeName(Payroll p) {
        if (p.getEmployee() != null && p.getEmployee().getUser() != null
                && p.getEmployee().getUser().getName() != null) {
            return p.getEmployee().getUser().getName();
        }
        return "(이름 미상)";
    }
}
