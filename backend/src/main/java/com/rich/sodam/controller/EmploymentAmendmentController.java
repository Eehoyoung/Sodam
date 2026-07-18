package com.rich.sodam.controller;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.dto.request.EmploymentAmendmentCreateRequest;
import com.rich.sodam.dto.response.EmploymentAmendmentResponse;
import com.rich.sodam.dto.response.LaborContractSendResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.EmploymentAmendmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stores/{storeId}/employment-amendments")
public class EmploymentAmendmentController {
    private final EmploymentAmendmentService service;

    @PostMapping
    public ResponseEntity<EmploymentAmendmentResponse> create(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long storeId,
            @Valid @RequestBody EmploymentAmendmentCreateRequest request) {
        EmploymentAmendmentResponse response = EmploymentAmendmentResponse.from(
                service.createDraft(principal.getId(), storeId, request));
        return ResponseEntity.created(URI.create("/api/stores/" + storeId
                + "/employment-amendments/" + response.id())).body(response);
    }

    @PostMapping("/{amendmentId}/send")
    public LaborContractSendResponse send(@AuthenticationPrincipal UserPrincipal principal,
                                           @PathVariable Long storeId, @PathVariable Long amendmentId) {
        ElectronicSignatureEnvelope envelope = service.send(principal.getId(), storeId, amendmentId);
        return LaborContractSendResponse.from(envelope);
    }

    @GetMapping
    public List<EmploymentAmendmentResponse> list(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable Long storeId,
                                                   @RequestParam Long employeeId) {
        return service.list(principal.getId(), storeId, employeeId).stream()
                .map(EmploymentAmendmentResponse::from).toList();
    }

    @DeleteMapping("/{amendmentId}")
    public ResponseEntity<Void> cancelDraft(@AuthenticationPrincipal UserPrincipal principal,
                                             @PathVariable Long storeId,
                                             @PathVariable Long amendmentId) {
        service.cancelDraft(principal.getId(), storeId, amendmentId);
        return ResponseEntity.noContent().build();
    }
}
