package com.rich.sodam.controller;

import com.rich.sodam.dto.request.EmployeeDocumentCreateRequest;
import com.rich.sodam.dto.response.EmployeeDocumentResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.EmployeeDocumentService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 직원 서류함 (A5/M-NEW-01) — 보관 + 만료 경보. 사장 전용.
 *
 * <p>음식점 보건증(1년 갱신 법정의무) 등 만료 임박 경보로 과태료 예방.
 * 원본 PII 미저장(fileRef 참조만).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
@Tag(name = "직원 서류함", description = "보건증 등 직원 서류 보관·만료 경보 (사장)")
public class EmployeeDocumentController {

    private final EmployeeDocumentService documentService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "직원 서류 추가")
    @PostMapping("/employees/{employeeId}/documents")
    public ResponseEntity<EmployeeDocumentResponse> add(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @Valid @RequestBody EmployeeDocumentCreateRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(documentService.add(employeeId, storeId, req));
    }

    @Operation(summary = "직원 서류 목록")
    @GetMapping("/employees/{employeeId}/documents")
    public ResponseEntity<List<EmployeeDocumentResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(documentService.listForEmployee(employeeId, storeId));
    }

    @Operation(summary = "직원 서류 삭제")
    @DeleteMapping("/employees/{employeeId}/documents/{docId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @PathVariable Long docId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        documentService.delete(storeId, docId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "매장 만료 임박 서류", description = "최근/임박(기본 30일 이내) 만료 서류 목록. 만료 경보 배너용.")
    @GetMapping("/documents/expiring")
    public ResponseEntity<List<EmployeeDocumentResponse>> expiring(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "30") int days) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(documentService.expiringSoon(storeId, days));
    }
}
