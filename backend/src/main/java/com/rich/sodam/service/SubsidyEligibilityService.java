package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.SubsidyStandards;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.SubsidyEligibilityResponse;
import com.rich.sodam.dto.response.SubsidyEligibilityResponse.Candidate;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 두루누리·고용지원금 자격 자동판정 (B7/M-NEW-03).
 *
 * <p>근로자 10인 미만 + 직원 월보수 기준 미만 → 사회보험료 지원 대상 추정. 출근·급여 데이터로
 * 소담이 자동 판정해 사장에게 신호. <b>실제 신청·지원액은 근로복지공단/정부24 위임</b>(면책).
 */
@Service
@RequiredArgsConstructor
public class SubsidyEligibilityService {

    static final String GUIDANCE =
            "근로자 10인 미만 사업장의 월보수 기준 미만 직원은 두루누리 사회보험료 지원 대상일 수 있어요.";
    static final String DISCLAIMER =
            "추정 안내예요. 실제 지원 자격·금액·신청은 근로복지공단·정부24에서 확인해 주세요.";

    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public SubsidyEligibilityResponse evaluate(Long storeId) {
        List<EmployeeStoreRelation> relations = employeeStoreRelationRepository.findByStore_Id(storeId).stream()
                .filter(r -> !Boolean.FALSE.equals(r.getIsActive()))
                .toList();

        int employeeCount = relations.size();
        boolean storeUnder10 = employeeCount < SubsidyStandards.HEADCOUNT_LIMIT;

        List<Candidate> candidates = new ArrayList<>();
        int eligibleCount = 0;
        for (EmployeeStoreRelation r : relations) {
            if (r.getEmployeeProfile() == null || r.getEmployeeProfile().getId() == null) {
                continue;
            }
            Long employeeId = r.getEmployeeProfile().getId();
            String name = employeeName(r);
            Integer monthlyWage = latestMonthlyWage(employeeId);
            boolean eligible = storeUnder10
                    && monthlyWage != null
                    && monthlyWage < SubsidyStandards.MONTHLY_WAGE_CAP;
            if (eligible) {
                eligibleCount++;
            }
            candidates.add(new Candidate(employeeId, name, monthlyWage, eligible));
        }

        return new SubsidyEligibilityResponse(
                storeId, employeeCount, storeUnder10, eligibleCount, candidates, GUIDANCE, DISCLAIMER);
    }

    /** 최근 급여 명세의 세전 급여를 월보수 추정으로 사용. 없으면 null(판정 보류). */
    private Integer latestMonthlyWage(Long employeeId) {
        List<Payroll> payrolls = payrollRepository.findByEmployee_IdOrderByEndDateDesc(employeeId);
        if (payrolls.isEmpty()) {
            return null;
        }
        return payrolls.get(0).getGrossWage();
    }

    private String employeeName(EmployeeStoreRelation r) {
        if (r.getEmployeeProfile() != null && r.getEmployeeProfile().getUser() != null
                && r.getEmployeeProfile().getUser().getName() != null) {
            return r.getEmployeeProfile().getUser().getName();
        }
        return "직원";
    }
}
