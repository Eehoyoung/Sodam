package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.dto.response.OnboardingResponse;
import com.rich.sodam.dto.response.OnboardingResponse.Step;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 직원 온보딩 체크리스트 (M-NEW-05/E-NEW-08). 신규 도메인 없이 기존 데이터를 집계한다.
 *
 * <p>단계: 근로계약서 서명 → 시급 설정 → 첫 출근. 순서가 곧 우선순위(다음 할 한 가지).
 */
@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final LaborContractService laborContractService;
    private final EmployeeStoreRelationRepository relationRepository;
    private final AttendanceRepository attendanceRepository;

    @Transactional(readOnly = true)
    public OnboardingResponse forEmployee(Long storeId, Long employeeId) {
        boolean contractSigned = laborContractService.findFor(employeeId, storeId).stream()
                .anyMatch(LaborContract::isSigned);
        boolean wageSet = relationRepository
                .findByEmployeeProfile_IdAndStore_Id(employeeId, storeId).isPresent();
        boolean firstAttendance = attendanceRepository
                .existsByEmployeeProfile_IdAndStore_Id(employeeId, storeId);

        List<Step> steps = new ArrayList<>();
        steps.add(new Step("CONTRACT", "근로계약서 서명", contractSigned));
        steps.add(new Step("WAGE", "시급 설정", wageSet));
        steps.add(new Step("FIRST_ATTENDANCE", "첫 출근", firstAttendance));

        int completed = (int) steps.stream().filter(Step::done).count();
        Step next = steps.stream().filter(s -> !s.done()).findFirst().orElse(null);

        return new OnboardingResponse(
                employeeId, storeId, steps, completed, steps.size(),
                next != null ? next.key() : null,
                next != null ? next.label() : null);
    }

    /** 직원 본인 — 소속 매장을 자동 해석해 온보딩 집계. 소속 매장 없으면 전부 대기. */
    @Transactional(readOnly = true)
    public OnboardingResponse forMyEmployee(Long employeeId) {
        Long storeId = relationRepository.findByEmployeeProfile_Id(employeeId).stream()
                .map(r -> r.getStore() != null ? r.getStore().getId() : null)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (storeId == null) {
            List<Step> steps = new ArrayList<>();
            steps.add(new Step("CONTRACT", "근로계약서 서명", false));
            steps.add(new Step("WAGE", "시급 설정", false));
            steps.add(new Step("FIRST_ATTENDANCE", "첫 출근", false));
            return new OnboardingResponse(employeeId, null, steps, 0, steps.size(), "CONTRACT", "근로계약서 서명");
        }
        return forEmployee(storeId, employeeId);
    }
}
