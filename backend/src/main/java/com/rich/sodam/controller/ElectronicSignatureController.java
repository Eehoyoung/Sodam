package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.ElectronicSignatureApplicationService;
import com.rich.sodam.service.ElectronicSignatureRefreshLimiter;
import com.rich.sodam.service.ElectronicSignatureEvidenceIntegrityService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@EmployeeOrMaster
@RestController
@RequestMapping("/api/e-sign/envelopes")
@RequiredArgsConstructor
public class ElectronicSignatureController {
    private final ElectronicSignatureApplicationService service;
    private final ElectronicSignatureRefreshLimiter refreshLimiter;
    private final ElectronicSignatureEvidenceIntegrityService integrityService;

    @GetMapping("/{envelopeId}")
    public ElectronicSignatureApplicationService.EnvelopeView status(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long envelopeId) {
        return service.getAuthorized(principal.getId(), envelopeId);
    }

    @PostMapping("/{envelopeId}/signing-request")
    public ResponseEntity<Void> signingRequest(@AuthenticationPrincipal UserPrincipal principal,
                                               @PathVariable Long envelopeId) {
        service.queueSigningRequest(principal.getId(), envelopeId);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/{envelopeId}/refresh")
    public ResponseEntity<Void> refresh(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable Long envelopeId) {
        refreshLimiter.check(principal.getId(), envelopeId);
        service.queueRefresh(principal.getId(), envelopeId);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{envelopeId}/document")
    public ResponseEntity<InputStreamResource> document(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable Long envelopeId) {
        ElectronicSignatureApplicationService.DocumentStream document =
                service.openDocument(principal.getId(), envelopeId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=electronic-signature-document.pdf")
                .header("Digest", "sha-256=" + document.sha256())
                .body(new InputStreamResource(document.stream()));
    }

    @GetMapping("/{envelopeId}/completion-certificate")
    public ResponseEntity<InputStreamResource> completionCertificate(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long envelopeId) {
        ElectronicSignatureApplicationService.DocumentStream certificate =
                service.completionCertificate(principal.getId(), envelopeId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=electronic-signature-certificate.pdf")
                .header("Digest", "sha-256=" + certificate.sha256())
                .body(new InputStreamResource(certificate.stream()));
    }

    @PostMapping("/{envelopeId}/integrity-check")
    public ElectronicSignatureEvidenceIntegrityService.IntegrityReport integrityCheck(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long envelopeId) {
        return integrityService.reconcile(principal.getId(), envelopeId);
    }
}
