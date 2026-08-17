package com.rich.sodam.controller;

import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.EmployeeResignationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 직원 사직서 제출·철회·사장 확인 API(260817 퇴사 처리 기능 계획서 WP-1).
 *
 * <p><b>확인(acknowledge)은 사장 전용</b>이다 — {@code assertMasterOwnsStore}만 사용하고
 * 매니저 위임 경로({@code assertMasterOrManagerPermission})는 붙이지 않는다. L-1(CONTRACT_MANAGE·
 * PAYROLL_CONFIRM 부여 흐름 확장 금지) 노무사 회신 전까지 유지되는 의도적 설계다.</p>
 */
@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
@Tag(name = "퇴사 처리", description = "직원 사직서 제출·철회, 사장 확인")
public class EmployeeResignationController {

    private final EmployeeResignationService resignationService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ResignationRequestBody {
        @NotNull
        private LocalDate desiredResignationDate;
        @Size(max = 200)
        private String reason;
    }

    @Operation(summary = "사직서 제출 (직원 본인)",
            description = "본인 소속(EmployeeStoreRelation)에 대해서만 신청할 수 있다. 희망 퇴사일은 데이터 캡처 전용 — 급여 계산에 반영되지 않는다.")
    @PostMapping("/api/stores/{storeId}/resignation-requests")
    public ResponseEntity<Map<String, Object>> request(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody ResignationRequestBody body) {
        EmployeeResignationService.RequestResult result = resignationService.requestResignation(
                storeId, principal.getId(), body.getDesiredResignationDate(), body.getReason());
        if (result.forbidden()) {
            return ResponseEntity.status(403).body(Map.of("message", result.forbiddenReason()));
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", result.id());
        res.put("status", result.status());
        return ResponseEntity.ok(res);
    }

    @Operation(summary = "사직서 철회 (신청자 본인)")
    @PutMapping("/api/stores/{storeId}/resignation-requests/{id}/withdraw")
    public ResponseEntity<Map<String, String>> withdraw(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        resignationService.withdraw(id, principal.getId());
        return ResponseEntity.ok(Map.of("message", "철회했어요."));
    }

    @Operation(summary = "매장 내 사직서 목록 (사장 전용)")
    @GetMapping("/api/stores/{storeId}/resignation-requests")
    public ResponseEntity<List<Map<String, Object>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(resignationService.storeRequests(storeId).stream()
                .map(this::toMap).toList());
    }

    @Operation(summary = "사직서 확인 (사장 전용, 비활성화 아님)",
            description = "협의된 퇴사일(agreedResignationDate)이 확정된 뒤에만 가능하다. 실제 비활성화는 별도 API(직원 활성/비활성 토글)에서 수행한다.")
    @PutMapping("/api/stores/{storeId}/resignation-requests/{id}/acknowledge")
    public ResponseEntity<Map<String, String>> acknowledge(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        Long resolvedStoreId = resignationService.resolveStoreIdForRequest(id);
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), resolvedStoreId);
        resignationService.acknowledge(id, principal.getId());
        return ResponseEntity.ok(Map.of("message", "확인했어요."));
    }

    @Operation(summary = "내 사직서 이력 (직원 본인)")
    @GetMapping("/api/resignation-requests/me")
    public ResponseEntity<List<Map<String, Object>>> mine(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(resignationService.myRequests(principal.getId()).stream()
                .map(this::toMap).toList());
    }

    private Map<String, Object> toMap(EmployeeResignationRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("desiredResignationDate", r.getDesiredResignationDate());
        m.put("agreedResignationDate", r.getAgreedResignationDate());
        m.put("reason", r.getReason());
        m.put("status", r.getStatus().name());
        m.put("requestedAt", r.getRequestedAt());
        m.put("decidedAt", r.getDecidedAt());
        return m;
    }
}
