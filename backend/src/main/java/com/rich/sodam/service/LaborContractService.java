package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 근로계약서 관리 (근로기준법 §17). 저장 시 §17 필수 기재사항 누락을 차단한다.
 */
@Service
@RequiredArgsConstructor
public class LaborContractService {

    private final LaborContractRepository laborContractRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;

    /**
     * 근로계약서를 저장한다. §17 필수 기재사항(임금·소정근로시간·휴일·취업장소·업무) 누락 시 거부.
     *
     * <p>소정근로일(contractedWeeklyDays)이 지정되면 직원-매장 관계에 전달한다.
     * 이 값이 설정되면 주휴수당 산정 시 폴백("출근≥1=개근") 대신 결근까지 정확 판정한다.
     */
    @Transactional
    public LaborContract save(LaborContract contract) {
        assertRequiredFields(contract);
        LaborContract saved = laborContractRepository.save(contract);
        propagateContractedWeeklyDays(saved);
        return saved;
    }

    /**
     * 계약의 소정근로일을 직원-매장 관계에 반영해 주휴 개근 판정 분모로 사용되게 한다.
     * 값이 없으면(미설정) 관계의 기존 값을 보존한다(폴백 동작 유지).
     */
    private void propagateContractedWeeklyDays(LaborContract contract) {
        Integer weeklyDays = contract.getContractedWeeklyDays();
        if (weeklyDays == null) {
            return;
        }
        employeeStoreRelationRepository
                .findRelation(contract.getEmployeeId(), contract.getStoreId())
                .ifPresent((EmployeeStoreRelation relation) -> {
                    relation.setContractedWeeklyDays(weeklyDays);
                    employeeStoreRelationRepository.save(relation);
                });
    }

    @Transactional(readOnly = true)
    public List<LaborContract> findFor(Long employeeId, Long storeId) {
        return laborContractRepository.findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(employeeId, storeId);
    }

    /**
     * 직원 본인의 모든 근로계약서를 최신순으로 조회한다.
     */
    @Transactional(readOnly = true)
    public List<LaborContract> findByEmployee(Long employeeId) {
        return laborContractRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public LaborContract findById(Long contractId) {
        return laborContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("근로계약서를 찾을 수 없어요."));
    }

    /**
     * 직원 본인이 근로계약서에 서명(동의)한다.
     *
     * <p>본인 계약이 아니면 {@link AccessDeniedException}. 이미 서명된 경우 멱등하게
     * 기존 계약을 그대로 반환한다(최초 서명 시각 보존).
     *
     * @param contractId 서명 대상 계약 id
     * @param employeeId 서명 주체(principal) — 계약의 employeeId 와 일치해야 함
     */
    @Transactional
    public LaborContract sign(Long contractId, Long employeeId) {
        LaborContract contract = findById(contractId);
        if (!contract.getEmployeeId().equals(employeeId)) {
            throw new AccessDeniedException("본인 근로계약서만 서명할 수 있어요.");
        }
        // markSigned 는 멱등 — 이미 서명돼 있으면 시각 보존하고 false 반환
        contract.markSigned(LocalDateTime.now());
        return laborContractRepository.save(contract);
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
