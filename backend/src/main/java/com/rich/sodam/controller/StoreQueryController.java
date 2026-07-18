package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.StoreQueryService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * StoreRepository의 조회/통계 기능을 API로 노출하는 컨트롤러.
 *
 * <p>⚠️ 보안: 본 컨트롤러는 멀티테넌트 환경이므로 호출자 본인 소유 매장/본인 정보로만 접근을 제한한다.
 * 과거에는 {@code @EmployeeOrMaster} 로 전 사업장 매장·통계를 무제한 노출(전테넌트 IDOR)했으나,
 * 매장 단위 소유권 가드 + 본인 범위(self) 검증으로 폐쇄하고, 소비자가 없고 전테넌트를 노출하던
 * 전역 목록/검색 엔드포인트(/active, /deleted, by-business-number, /search/*)는 제거했다.</p>
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/store-queries")
@RequiredArgsConstructor
public class StoreQueryController {

    private final StoreQueryService storeQueryService;
    private final StoreAccessGuard guard;

    /** path/param 의 userId 가 호출자 본인인지 검증 (타인 데이터 조회 차단). */
    private void assertSelf(UserPrincipal principal, Long userId) {
        if (userId == null || !userId.equals(principal.getId())) {
            throw new AccessDeniedException("본인 정보만 조회할 수 있어요.");
        }
    }

    @Operation(summary = "ID로 활성 매장 조회 (본인 소유)")
    @MasterOnly
    @GetMapping("/active/{id}")
    public ResponseEntity<Store> findActiveById(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable Long id) {
        guard.assertMasterOwnsStore(principal.getId(), id);
        return storeQueryService.findActiveById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "사장이 관리하는 활성 매장 목록 조회 (본인)")
    @MasterOnly
    @GetMapping("/by-master/{userId}")
    public ResponseEntity<List<Store>> findActiveStoresByMaster(@AuthenticationPrincipal UserPrincipal principal,
                                                                @PathVariable Long userId) {
        assertSelf(principal, userId);
        return ResponseEntity.ok(storeQueryService.findActiveStoresByMaster(userId));
    }

    @Operation(summary = "특정 사용자가 매장의 사장인지 여부 확인 (본인)")
    @MasterOnly
    @GetMapping("/ownership/exists")
    public ResponseEntity<Boolean> isMasterOfStore(@AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestParam Long storeId, @RequestParam Long userId) {
        assertSelf(principal, userId);
        return ResponseEntity.ok(storeQueryService.isMasterOfStore(storeId, userId));
    }

    @Operation(summary = "활성 직원 수 조회 (본인 소유 매장)")
    @GetMapping("/{storeId}/stats/employees/active/count")
    public ResponseEntity<Integer> countActiveEmployees(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.DASHBOARD_VIEW);
        return ResponseEntity.ok(storeQueryService.countActiveEmployees(storeId));
    }

    @Operation(summary = "출근 기록 수 조회 (본인 소유 매장)")
    @GetMapping("/{storeId}/stats/attendance/count")
    public ResponseEntity<Integer> countAttendance(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.DASHBOARD_VIEW);
        return ResponseEntity.ok(storeQueryService.countAttendance(storeId));
    }

    @Operation(summary = "급여 기록 수 조회 (본인 소유 매장)")
    @MasterOnly
    @GetMapping("/{storeId}/stats/payroll/count")
    public ResponseEntity<Integer> countPayroll(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(storeQueryService.countPayroll(storeId));
    }

    @Operation(summary = "미지급 급여 건수 조회 (본인 소유 매장)")
    @MasterOnly
    @GetMapping("/{storeId}/stats/payroll/unpaid/count")
    public ResponseEntity<Integer> countUnpaidPayroll(@AuthenticationPrincipal UserPrincipal principal,
                                                      @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(storeQueryService.countUnpaidPayroll(storeId));
    }

    @Operation(summary = "마지막 활동 시간 조회 (본인 소유 매장)")
    @GetMapping("/{storeId}/last-activity")
    public ResponseEntity<LocalDateTime> findLastActivity(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PathVariable Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.DASHBOARD_VIEW);
        return storeQueryService.findLastActivity(storeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
