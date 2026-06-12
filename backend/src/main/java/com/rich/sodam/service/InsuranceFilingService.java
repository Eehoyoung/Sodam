package com.rich.sodam.service;

import com.rich.sodam.core.payroll.deduction.SocialInsuranceCalculator;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.dto.request.InsuranceFilingRequest;
import com.rich.sodam.dto.response.InsuranceFilingForm;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.util.ResidentNumbers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * 4대보험 신고서 <b>서식 자동작성</b> 서비스. 소담은 SW 보조까지만 — 공단 제출(EDI)은 사장이 직접.
 * (공인노무사법·보험사무대행 위반 회피. 확정안 §4-2·C-2)
 *
 * <p>⚠️ 주민번호는 어떤 영속 계층·로그에도 남기지 않는다. 요청에서 받아 서식에 채워 반환만 하고 폐기.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InsuranceFilingService {

    private static final String DISCLAIMER =
            "이 서식은 사장님이 직접 국민연금공단·건강보험공단·근로복지공단에 제출하는 보조 자료예요. "
            + "소담은 신고를 대행하지 않으며, 정확한 보험료는 공단이 최종 확정합니다.";

    private final EmployeeProfileRepository employeeProfileRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final SocialInsuranceCalculator insuranceCalculator;

    @Transactional(readOnly = true)
    public InsuranceFilingForm generateForm(Long storeId, InsuranceFilingRequest req) {
        if (!relationRepository.existsByEmployeeProfile_IdAndStore_Id(req.getEmployeeId(), storeId)) {
            throw new IllegalArgumentException("해당 매장 소속 직원이 아닙니다.");
        }
        EmployeeProfile profile = employeeProfileRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new NoSuchElementException("직원을 찾을 수 없습니다."));
        String name = profile.getUser() != null ? profile.getUser().getName() : null;

        int wage = req.getMonthlyWage();
        List<InsuranceFilingForm.InsuranceLine> lines = List.of(
                new InsuranceFilingForm.InsuranceLine("국민연금",
                        insuranceCalculator.nationalPension(wage), "기준소득월액 상·하한 적용"),
                new InsuranceFilingForm.InsuranceLine("건강보험",
                        insuranceCalculator.healthInsurance(wage), "보수월액 기준"),
                new InsuranceFilingForm.InsuranceLine("장기요양",
                        insuranceCalculator.longTermCare(wage), "건강보험료액 기준"),
                new InsuranceFilingForm.InsuranceLine("고용보험",
                        insuranceCalculator.employmentInsurance(wage), "실업급여분"),
                new InsuranceFilingForm.InsuranceLine("산재보험",
                        0, "전액 사업주 부담(근로자 공제 없음)")
        );

        // 주민번호는 마스킹 값만 로그에 남긴다.
        log.info("4대보험 신고서 생성 store={} employee={} type={} 주민번호={}",
                storeId, req.getEmployeeId(), req.getFilingType(),
                ResidentNumbers.mask(req.getResidentNumber()));

        return new InsuranceFilingForm(
                name,
                req.getResidentNumber(),                         // 제출용 echo (미저장)
                ResidentNumbers.mask(req.getResidentNumber()),   // 표시용 마스킹
                req.getFilingType(),
                req.getFilingType().getDisplayName(),
                req.getEffectiveDate(),
                wage,
                lines,
                DISCLAIMER);
    }
}
