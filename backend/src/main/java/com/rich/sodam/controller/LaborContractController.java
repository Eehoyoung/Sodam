package com.rich.sodam.controller;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.LaborContractCreateRequest;
import com.rich.sodam.dto.response.LaborContractContextResponse;
import com.rich.sodam.dto.response.LaborContractResponse;
import com.rich.sodam.dto.response.LaborContractSendResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.LaborContractElectronicSignatureService;
import com.rich.sodam.service.LaborContractService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.DelegatedActionAuthorityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * S1 전자 근로계약서 — 사장 작성·발송 / 직원 열람·서명.
 *
 * <p>권한: 사업주 또는 현재 위임에 CONTRACT_MANAGE가 있는 매니저, 직원 작업은
 * {@code principal.getId()} 기준 본인 한정. EmployeeProfile.id == User.id 이므로
 * principal id 가 곧 employeeId 다.
 */
@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class LaborContractController {

    private final LaborContractService laborContractService;
    private final StoreAccessGuard guard;
    private final LaborContractElectronicSignatureService laborContractElectronicSignatureService;
    private final DelegatedActionAuthorityService authorityService;

    // ===== 사장 (Master) =====

    /**
     * 사장이 근로계약서를 작성·저장한다.
     */
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.E_CONTRACT)
    @PostMapping("/stores/{storeId}/labor-contracts")
    public ResponseEntity<LaborContractResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody LaborContractCreateRequest body) {
        authorityService.requireContract(principal.getId(), storeId);
        guard.assertEmployeeInStore(body.employeeId(), storeId);
        // principal = 계약 작성 사장 — 임금형태 전환 이력(EmploymentTypeChangeLog)의 수행자로 기록
        LaborContract saved = laborContractService.save(body.toEntity(storeId), principal.getId());
        return ResponseEntity.ok(LaborContractResponse.from(saved));
    }

    /**
     * 사장이 근로계약서 작성 화면에 채워줄 보조정보(당사자 정보·최저임금·가산율 등)를 조회한다.
     */
    @GetMapping("/stores/{storeId}/labor-contracts/context")
    public ResponseEntity<LaborContractContextResponse> context(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam Long employeeId) {
        authorityService.requireContract(principal.getId(), storeId);
        guard.assertEmployeeInStore(employeeId, storeId);
        return ResponseEntity.ok(laborContractService.buildContext(storeId, employeeId));
    }

    /**
     * 사장이 특정 직원의 근로계약서 목록을 조회한다.
     */
    @GetMapping("/stores/{storeId}/employees/{employeeId}/labor-contracts")
    public ResponseEntity<List<LaborContractResponse>> listForEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        authorityService.requireContract(principal.getId(), storeId);
        List<LaborContractResponse> result = laborContractService.findFor(employeeId, storeId).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 사장의 임시저장(미발송) 계약서 목록 — create() 만 되고 send() 가 안/못 된 초안 관리용.
     * (예: 발송 API 실패 후 화면을 벗어나 방치된 계약을 나중에 재발송하거나 삭제할 수 있게 한다.)
     */
    @GetMapping("/stores/{storeId}/employees/{employeeId}/labor-contracts/drafts")
    public ResponseEntity<List<LaborContractResponse>> listDrafts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        authorityService.requireContract(principal.getId(), storeId);
        List<LaborContractResponse> result = laborContractService.findDrafts(employeeId, storeId).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 사장이 임시저장(미발송) 계약서를 삭제한다. 이미 발송된 계약은 거부된다.
     */
    @DeleteMapping("/stores/{storeId}/labor-contracts/{id}")
    public ResponseEntity<Void> deleteDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        authorityService.requireContract(principal.getId(), storeId);
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("해당 매장의 근로계약서가 아니에요.");
        }
        laborContractService.deleteDraft(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 사장이 작성한 근로계약서를 직원에게 발송(인박스 알림 적재)한다.
     * 외부 발신이 아닌 앱 내 알림 적재이므로 자율 수행 OK.
     */
    @PostMapping("/stores/{storeId}/labor-contracts/{id}/send")
    public ResponseEntity<LaborContractSendResponse> send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        authorityService.requireContract(principal.getId(), storeId);
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("해당 매장의 근로계약서가 아니에요.");
        }
        return ResponseEntity.ok(LaborContractSendResponse.from(
                laborContractElectronicSignatureService.send(principal.getId(), storeId, id)));
    }

    /**
     * 사장이 근로계약서 PDF를 다운로드한다(§17 서면 명시·교부 의무의 전자 문서 구현).
     */
    @GetMapping("/stores/{storeId}/labor-contracts/{id}/pdf")
    public ResponseEntity<byte[]> pdfForMaster(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        authorityService.requireContract(principal.getId(), storeId);
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("해당 매장의 근로계약서가 아니에요.");
        }
        return pdfResponse(laborContractService.generateContractPdf(id), id);
    }

    // ===== 직원 (Employee) =====

    /**
     * 직원 본인의 근로계약서 목록을 조회한다.
     */
    @GetMapping("/labor-contracts/my")
    public ResponseEntity<List<LaborContractResponse>> my(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<LaborContractResponse> result = laborContractService.findByEmployee(principal.getId()).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 직원 본인이 근로계약서 PDF를 다운로드한다.
     */
    @GetMapping("/labor-contracts/{id}/pdf")
    public ResponseEntity<byte[]> pdfForEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getEmployeeId().equals(principal.getId())) {
            throw new AccessDeniedException("본인 근로계약서만 다운로드할 수 있어요.");
        }
        if (!contract.isSent()) {
            throw new IllegalStateException("아직 발송되지 않은 근로계약서예요.");
        }
        return pdfResponse(laborContractService.generateContractPdf(id), id);
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] pdfBytes, Long id) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "labor_contract_" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
