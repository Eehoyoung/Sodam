package com.rich.sodam.service;

import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * 사용자 ID(principal) 와 리소스 ID(매장/직원/타임오프) 간의 소유/소속 관계 검증.
 *
 * <p>모든 메서드는 검증 실패 시 {@link AccessDeniedException} 을 던진다.
 * 호출부는 try/catch 없이 통과 시 진행만 하면 됨. (GlobalExceptionHandler 가 403 응답으로 변환)
 *
 * <p>보안 감사 2026-05-23 의 P0-3/P0-4/P0-7/P0-8 fix 용.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StoreAccessGuard {

    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final TimeOffRepository timeOffRepository;

    /**
     * 사장이 해당 매장을 소유하는지 검증. 미소유 시 AccessDeniedException.
     */
    public void assertMasterOwnsStore(Long masterId, Long storeId) {
        requireNonNull(masterId, "masterId");
        requireNonNull(storeId, "storeId");
        if (!masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(masterId, storeId)) {
            log.warn("권한 거부: master {} 가 store {} 미소유", masterId, storeId);
            throw new AccessDeniedException("해당 매장에 대한 권한이 없어요.");
        }
    }

    /**
     * 직원이 해당 매장에 소속되어 있는지 검증.
     */
    public void assertEmployeeInStore(Long employeeId, Long storeId) {
        requireNonNull(employeeId, "employeeId");
        requireNonNull(storeId, "storeId");
        if (!employeeStoreRelationRepository.existsByEmployeeProfile_IdAndStore_Id(employeeId, storeId)) {
            log.warn("권한 거부: employee {} 가 store {} 미소속", employeeId, storeId);
            throw new AccessDeniedException("해당 매장 소속이 아니에요.");
        }
    }

    /**
     * 사장이 해당 timeOff(휴가 신청) 가 속한 매장을 소유하는지 검증.
     * 휴가 승인/거부 같은 사장 권한 작업에 사용.
     */
    public void assertMasterOwnsTimeOff(Long masterId, Long timeOffId) {
        requireNonNull(masterId, "masterId");
        requireNonNull(timeOffId, "timeOffId");
        TimeOff timeOff = timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new AccessDeniedException("휴가 신청을 찾을 수 없어요."));
        if (timeOff.getStore() == null || timeOff.getStore().getId() == null) {
            log.warn("timeOff {} 의 매장 정보 누락", timeOffId);
            throw new AccessDeniedException("해당 휴가 신청에 대한 권한이 없어요.");
        }
        assertMasterOwnsStore(masterId, timeOff.getStore().getId());
    }

    /**
     * principal 이 본인이거나 또는 그 직원의 매장 사장인지 검증.
     * 직원 본인은 항상 자기 정보 조회 가능. 사장은 자기 매장 직원 정보 조회 가능.
     */
    public void assertCanViewEmployee(Long principalId, Long employeeId, boolean isMasterRole) {
        requireNonNull(principalId, "principalId");
        requireNonNull(employeeId, "employeeId");
        // 본인이면 항상 통과
        if (principalId.equals(employeeId)) return;
        // 사장이면 자기 매장 직원인지 확인
        if (isMasterRole) {
            // 직원이 어떤 매장 소속이든, 그 매장 중 하나라도 principal(사장) 이 소유하면 OK
            boolean anyMatch = employeeStoreRelationRepository.findByEmployeeProfile_Id(employeeId).stream()
                    .anyMatch(rel -> rel.getStore() != null
                            && masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(
                                    principalId, rel.getStore().getId()));
            if (anyMatch) return;
        }
        log.warn("권한 거부: principal {} 가 employee {} 조회 시도 (master={})", principalId, employeeId, isMasterRole);
        throw new AccessDeniedException("해당 직원 정보에 대한 권한이 없어요.");
    }

    /**
     * principal 본인의 ID 와 입력된 employeeId 가 일치하는지 검증.
     * 직원 본인 전용 작업 (출퇴근, 시급 조회 본인분 등) 에 사용.
     */
    public void assertSelf(Long principalId, Long employeeId) {
        requireNonNull(principalId, "principalId");
        requireNonNull(employeeId, "employeeId");
        if (!principalId.equals(employeeId)) {
            log.warn("권한 거부: principal {} != employee {}", principalId, employeeId);
            throw new AccessDeniedException("본인 정보만 접근할 수 있어요.");
        }
    }

    private static void requireNonNull(Object v, String name) {
        if (v == null) throw new AccessDeniedException(name + " 가 비어있어요. (로그인 필요)");
    }
}
