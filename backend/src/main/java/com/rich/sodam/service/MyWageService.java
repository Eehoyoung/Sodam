package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.WageHistory;
import com.rich.sodam.dto.response.MyWageHistoryDto;
import com.rich.sodam.dto.response.WageHistoryDto;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.WageHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 직원 본인용 시급 이력 조회 (E-NEW-02). 읽기 전용.
 *
 * <p>본인에게 적용되는 시급 변경 타임라인을 만든다:
 * <ul>
 *   <li>본인 개별 시급 변경(EMPLOYEE_OVERRIDE) — 모든 소속 매장</li>
 *   <li>소속 매장의 기본 시급 변경(STORE_DEFAULT)</li>
 * </ul>
 * 두 출처를 병합해 적용일(effectiveFrom) 내림차순으로 정렬한다.</p>
 *
 * <p>직원 전용이므로 변경 주체(changedBy)·사장 메모(ownerMemo)는 응답에 절대 포함하지 않는다.
 * 응답 DTO({@link WageHistoryDto})에 해당 필드가 없도록 설계되어 구조적으로 차단된다.</p>
 */
@Service
@RequiredArgsConstructor
public class MyWageService {

    private final EmployeeStoreRelationRepository relationRepository;
    private final WageHistoryRepository wageHistoryRepository;

    /**
     * 본인(employeeId == User.id) 시급 이력. 타인 ID 조회 불가 — 호출부에서 principal.getId() 만 넘긴다.
     */
    @Transactional(readOnly = true)
    public MyWageHistoryDto getMyWageHistory(Long employeeId) {
        List<EmployeeStoreRelation> relations = relationRepository.findByEmployeeProfile_Id(employeeId);

        Set<Long> storeIds = relations.stream()
                .filter(r -> r.getStore() != null)
                .map(r -> r.getStore().getId())
                .collect(Collectors.toSet());

        Integer currentWage = relations.stream()
                .filter(EmployeeStoreRelation::getIsActive)
                .map(EmployeeStoreRelation::getAppliedHourlyWage)
                .findFirst()
                .orElse(null);

        List<WageHistory> overrides = wageHistoryRepository
                .findByScopeAndEmployee_IdOrderByEffectiveFromDesc(WageHistory.Scope.EMPLOYEE_OVERRIDE, employeeId);

        List<WageHistory> storeDefaults = storeIds.isEmpty() ? List.of()
                : wageHistoryRepository.findByScopeAndStore_IdInOrderByEffectiveFromDesc(
                        WageHistory.Scope.STORE_DEFAULT, storeIds);

        List<WageHistoryDto> merged = java.util.stream.Stream.concat(overrides.stream(), storeDefaults.stream())
                .sorted(Comparator.comparing(WageHistory::getEffectiveFrom).reversed())
                .map(WageHistoryDto::from)
                .toList();

        return new MyWageHistoryDto(currentWage, merged);
    }
}
