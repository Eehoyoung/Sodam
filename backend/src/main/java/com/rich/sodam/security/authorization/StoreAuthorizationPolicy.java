package com.rich.sodam.security.authorization;

import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.exception.ManagerAccessDeniedException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.service.PlanAccessService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * 사용자 ID(principal) 와 리소스 ID(매장/직원/타임오프) 간의 소유/소속 관계 검증.
 *
 * <p>모든 메서드는 검증 실패 시 {@link AccessDeniedException} 을 던진다.
 * 호출부는 try/catch 없이 통과 시 진행만 하면 됨. (GlobalExceptionHandler 가 403 응답으로 변환)
 *
 * <p>보안 감사 2026-05-23 의 P0-3/P0-4/P0-7/P0-8 fix 용.
 *
 * <p>WP-08(인가 정책 모듈화): 이 클래스가 실제 인가 로직을 담당하는 원본이다.
 * {@code com.rich.sodam.service.StoreAccessGuard} 는 기존 컨트롤러(47곳) 호출 호환을 위해
 * 남겨둔 얇은 위임 facade이며, 실제 구현은 이 클래스로 이동했다.
 */
@Slf4j
@Component
public class StoreAuthorizationPolicy {

    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final TimeOffRepository timeOffRepository;
    private final PlanAccessService planAccessService;
    private final boolean managerDelegationEnabled;

    public StoreAuthorizationPolicy(MasterStoreRelationRepository masterStoreRelationRepository,
                            EmployeeStoreRelationRepository employeeStoreRelationRepository,
                            TimeOffRepository timeOffRepository,
                            PlanAccessService planAccessService,
                            @Value("${sodam.features.manager-delegation-enabled:false}")
                            boolean managerDelegationEnabled) {
        this.masterStoreRelationRepository = masterStoreRelationRepository;
        this.employeeStoreRelationRepository = employeeStoreRelationRepository;
        this.timeOffRepository = timeOffRepository;
        this.planAccessService = planAccessService;
        this.managerDelegationEnabled = managerDelegationEnabled;
    }

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
     * 매장 구성원(사장 소유 또는 직원 소속)인지 검증 — 사장·직원 공용 조회 API 용(대타 모집 목록 등).
     */
    public void assertMemberOfStore(Long userId, Long storeId) {
        requireNonNull(userId, "userId");
        requireNonNull(storeId, "storeId");
        if (masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(userId, storeId)) return;
        if (employeeStoreRelationRepository.existsByEmployeeProfile_IdAndStore_Id(userId, storeId)) return;
        log.warn("권한 거부: user {} 가 store {} 비구성원", userId, storeId);
        throw new AccessDeniedException("해당 매장 구성원이 아니에요.");
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

    public void assertManagerPermission(Long userId, Long storeId, ManagerPermission permission) {
        requireNonNull(userId, "userId");
        requireNonNull(storeId, "storeId");
        assertManagerDelegationEnabled();
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(userId, storeId)
                .orElseThrow(ManagerAccessDeniedException::permissionDenied);
        if (relation.getStoreRole() != com.rich.sodam.domain.type.StoreRole.MANAGER) {
            throw ManagerAccessDeniedException.permissionDenied();
        }
        if (relation.getManagerAcceptedAt() == null || relation.getManagerSignatureEnvelopeId() == null) {
            throw ManagerAccessDeniedException.signaturePending();
        }
        if (!planAccessService.storeOwnerHasFeature(storeId, PlanFeature.MANAGER_DELEGATION)) {
            throw ManagerAccessDeniedException.subscriptionFrozen();
        }
        if (!relation.hasActiveManagerPermission(permission)) {
            throw ManagerAccessDeniedException.permissionDenied();
        }
    }

    public void assertMasterOrManagerPermission(Long userId, Long storeId, ManagerPermission permission) {
        requireNonNull(userId, "userId");
        requireNonNull(storeId, "storeId");
        if (masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(userId, storeId)) return;
        assertManagerPermission(userId, storeId, permission);
    }

    public void assertMasterOrManagerOwnsTimeOff(Long userId, Long timeOffId, ManagerPermission permission) {
        requireNonNull(userId, "userId");
        requireNonNull(timeOffId, "timeOffId");
        TimeOff timeOff = timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new AccessDeniedException("휴가 신청을 찾을 수 없어요."));
        if (timeOff.getStore() == null || timeOff.getStore().getId() == null) {
            throw new AccessDeniedException("휴가 신청 매장을 확인할 수 없어요.");
        }
        assertMasterOrManagerPermission(userId, timeOff.getStore().getId(), permission);
    }

    public boolean isMasterOwner(Long userId, Long storeId) {
        return userId != null && storeId != null
                && masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(userId, storeId);
    }

    public void assertManagerDelegationEnabled() {
        if (!managerDelegationEnabled) throw ManagerAccessDeniedException.featureDisabled();
    }

    public boolean isManagerDelegationEnabled() {
        return managerDelegationEnabled;
    }

    private static void requireNonNull(Object v, String name) {
        if (v == null) throw new AccessDeniedException(name + " 가 비어있어요. (로그인 필요)");
    }
}
