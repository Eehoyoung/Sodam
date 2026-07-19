package com.rich.sodam.service;

import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * 사용자 ID(principal) 와 리소스 ID(매장/직원/타임오프) 간의 소유/소속 관계 검증.
 *
 * <p><b>WP-08(인가 정책 모듈화)</b>: 실제 구현은 {@link StoreAuthorizationPolicy}
 * ({@code com.rich.sodam.security.authorization} 패키지) 로 이동했다. 이 클래스는
 * 기존 호출부(컨트롤러 47곳)가 {@code service} 패키지의 {@code StoreAccessGuard} 를
 * 그대로 참조하고 있어, 그 호환을 깨지 않기 위해 남겨둔 얇은 위임(delegate) facade다.
 * 모든 메서드는 동일 시그니처로 {@link StoreAuthorizationPolicy} 를 그대로 호출만 한다 —
 * 새 인가 로직은 여기가 아니라 {@link StoreAuthorizationPolicy} 에 추가할 것.
 *
 * <p>모든 메서드는 검증 실패 시 {@link AccessDeniedException} 을 던진다.
 * 호출부는 try/catch 없이 통과 시 진행만 하면 됨. (GlobalExceptionHandler 가 403 응답으로 변환)
 *
 * <p>보안 감사 2026-05-23 의 P0-3/P0-4/P0-7/P0-8 fix 용.
 */
@Component
public class StoreAccessGuard {

    private final StoreAuthorizationPolicy policy;

    public StoreAccessGuard(StoreAuthorizationPolicy policy) {
        this.policy = policy;
    }

    /**
     * 사장이 해당 매장을 소유하는지 검증. 미소유 시 AccessDeniedException.
     */
    public void assertMasterOwnsStore(Long masterId, Long storeId) {
        policy.assertMasterOwnsStore(masterId, storeId);
    }

    /**
     * 직원이 해당 매장에 소속되어 있는지 검증.
     */
    public void assertEmployeeInStore(Long employeeId, Long storeId) {
        policy.assertEmployeeInStore(employeeId, storeId);
    }

    /**
     * 매장 구성원(사장 소유 또는 직원 소속)인지 검증 — 사장·직원 공용 조회 API 용(대타 모집 목록 등).
     */
    public void assertMemberOfStore(Long userId, Long storeId) {
        policy.assertMemberOfStore(userId, storeId);
    }

    /**
     * 사장이 해당 timeOff(휴가 신청) 가 속한 매장을 소유하는지 검증.
     * 휴가 승인/거부 같은 사장 권한 작업에 사용.
     */
    public void assertMasterOwnsTimeOff(Long masterId, Long timeOffId) {
        policy.assertMasterOwnsTimeOff(masterId, timeOffId);
    }

    /**
     * principal 이 본인이거나 또는 그 직원의 매장 사장인지 검증.
     * 직원 본인은 항상 자기 정보 조회 가능. 사장은 자기 매장 직원 정보 조회 가능.
     */
    public void assertCanViewEmployee(Long principalId, Long employeeId, boolean isMasterRole) {
        policy.assertCanViewEmployee(principalId, employeeId, isMasterRole);
    }

    /**
     * principal 본인의 ID 와 입력된 employeeId 가 일치하는지 검증.
     * 직원 본인 전용 작업 (출퇴근, 시급 조회 본인분 등) 에 사용.
     */
    public void assertSelf(Long principalId, Long employeeId) {
        policy.assertSelf(principalId, employeeId);
    }

    public void assertManagerPermission(Long userId, Long storeId, ManagerPermission permission) {
        policy.assertManagerPermission(userId, storeId, permission);
    }

    public void assertMasterOrManagerPermission(Long userId, Long storeId, ManagerPermission permission) {
        policy.assertMasterOrManagerPermission(userId, storeId, permission);
    }

    public void assertMasterOrManagerOwnsTimeOff(Long userId, Long timeOffId, ManagerPermission permission) {
        policy.assertMasterOrManagerOwnsTimeOff(userId, timeOffId, permission);
    }

    public boolean isMasterOwner(Long userId, Long storeId) {
        return policy.isMasterOwner(userId, storeId);
    }

    public void assertManagerDelegationEnabled() {
        policy.assertManagerDelegationEnabled();
    }

    public boolean isManagerDelegationEnabled() {
        return policy.isManagerDelegationEnabled();
    }
}
