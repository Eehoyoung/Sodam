package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 근로계약서 관리 (근로기준법 §17). 저장 시 §17 필수 기재사항 누락을 차단한다.
 */
@Service
@RequiredArgsConstructor
public class LaborContractService {

    private final LaborContractRepository laborContractRepository;

    /**
     * 근로계약서를 저장한다. §17 필수 기재사항(임금·소정근로시간·휴일·취업장소·업무) 누락 시 거부.
     */
    @Transactional
    public LaborContract save(LaborContract contract) {
        assertRequiredFields(contract);
        return laborContractRepository.save(contract);
    }

    @Transactional(readOnly = true)
    public List<LaborContract> findFor(Long employeeId, Long storeId) {
        return laborContractRepository.findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(employeeId, storeId);
    }

    private void assertRequiredFields(LaborContract c) {
        if (c.getEmployeeId() == null || c.getStoreId() == null) {
            throw new IllegalArgumentException("직원·매장 정보는 필수입니다.");
        }
        if (c.getHourlyWage() == null || c.getHourlyWage() <= 0) {
            throw new IllegalArgumentException("임금(시급)은 필수 기재사항입니다(§17).");
        }
        if (c.getContractedHoursPerWeek() == null) {
            throw new IllegalArgumentException("소정근로시간은 필수 기재사항입니다(§17).");
        }
        if (isBlank(c.getWeeklyHolidayDay())) {
            throw new IllegalArgumentException("휴일은 필수 기재사항입니다(§17·§55).");
        }
        if (isBlank(c.getWorkLocation()) || isBlank(c.getJobDescription())) {
            throw new IllegalArgumentException("취업 장소·종사 업무는 필수 기재사항입니다(§17).");
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
