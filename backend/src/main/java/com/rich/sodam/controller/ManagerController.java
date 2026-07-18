package com.rich.sodam.controller;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.dto.request.ManagerAppointmentRequest;
import com.rich.sodam.dto.request.ManagerRevocationRequest;
import com.rich.sodam.dto.request.ManagerPermissionUpdateRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.ManagerDelegationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ManagerController {
    private final ManagerDelegationService service;

    @MasterOnly
    @PostMapping("/api/stores/{storeId}/managers")
    public ResponseEntity<Map<String, Object>> appoint(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable Long storeId,
                                                        @Valid @RequestBody ManagerAppointmentRequest request) {
        ElectronicSignatureEnvelope envelope = service.appoint(
                principal.getId(), storeId, request.employeeId(), request.permissions());
        return ResponseEntity.created(URI.create("/api/e-sign/envelopes/" + envelope.getId()))
                .body(Map.of("envelopeId", envelope.getId(), "status", envelope.getStatus().name()));
    }

    @MasterOnly
    @GetMapping("/api/stores/{storeId}/managers")
    public List<ManagerDelegationService.ManagerView> managers(@AuthenticationPrincipal UserPrincipal principal,
                                                               @PathVariable Long storeId) {
        return service.managers(principal.getId(), storeId);
    }

    @MasterOnly
    @PutMapping("/api/stores/{storeId}/managers/{employeeId}")
    public ManagerDelegationService.PermissionUpdateView updatePermissions(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long storeId,
            @PathVariable Long employeeId, @Valid @RequestBody ManagerPermissionUpdateRequest request) {
        return service.updatePermissions(principal.getId(), storeId, employeeId, request.permissions());
    }

    @MasterOnly
    @DeleteMapping("/api/stores/{storeId}/managers/{employeeId}")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal UserPrincipal principal,
                                       @PathVariable Long storeId, @PathVariable Long employeeId,
                                       @Valid @RequestBody(required = false) ManagerRevocationRequest request) {
        service.revoke(principal.getId(), storeId, employeeId, request == null ? null : request.reason());
        return ResponseEntity.noContent().build();
    }

    @MasterOnly
    @GetMapping("/api/stores/{storeId}/delegation-audit")
    public List<ManagerDelegationService.AuditView> audit(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PathVariable Long storeId) {
        return service.audit(principal.getId(), storeId);
    }

    @EmployeeOrMaster
    @GetMapping("/api/me/managed-stores")
    public List<ManagerDelegationService.ManagedStoreView> managedStores(
            @AuthenticationPrincipal UserPrincipal principal) {
        return service.managedStores(principal.getId());
    }
}
