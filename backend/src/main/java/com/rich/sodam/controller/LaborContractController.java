package com.rich.sodam.controller;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.LaborContractCreateRequest;
import com.rich.sodam.dto.request.LaborContractSignRequest;
import com.rich.sodam.dto.response.LaborContractContextResponse;
import com.rich.sodam.dto.response.LaborContractResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.EmployeeDocumentService;
import com.rich.sodam.service.FixedScheduleService;
import com.rich.sodam.service.LaborContractService;
import com.rich.sodam.service.NotificationService;
import com.rich.sodam.service.StoreAccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * S1 전자 근로계약서 — 사장 작성·발송 / 직원 열람·서명.
 *
 * <p>권한: 사장 작업은 {@link MasterOnly} + 매장 ownership 검증, 직원 작업은
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
    private final NotificationService notificationService;
    private final EmployeeDocumentService employeeDocumentService;
    private final FixedScheduleService fixedScheduleService;

    // ===== 사장 (Master) =====

    /**
     * 사장이 근로계약서를 작성·저장한다.
     */
    @MasterOnly
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.E_CONTRACT)
    @PostMapping("/stores/{storeId}/labor-contracts")
    public ResponseEntity<LaborContractResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody LaborContractCreateRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(body.employeeId(), storeId);
        // principal = 계약 작성 사장 — 임금형태 전환 이력(EmploymentTypeChangeLog)의 수행자로 기록
        LaborContract saved = laborContractService.save(body.toEntity(storeId), principal.getId());
        return ResponseEntity.ok(LaborContractResponse.from(saved));
    }

    /**
     * 사장이 근로계약서 작성 화면에 채워줄 보조정보(당사자 정보·최저임금·가산율 등)를 조회한다.
     */
    @MasterOnly
    @GetMapping("/stores/{storeId}/labor-contracts/context")
    public ResponseEntity<LaborContractContextResponse> context(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam Long employeeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(employeeId, storeId);
        return ResponseEntity.ok(laborContractService.buildContext(storeId, employeeId));
    }

    /**
     * 사장이 특정 직원의 근로계약서 목록을 조회한다.
     */
    @MasterOnly
    @GetMapping("/stores/{storeId}/employees/{employeeId}/labor-contracts")
    public ResponseEntity<List<LaborContractResponse>> listForEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        List<LaborContractResponse> result = laborContractService.findFor(employeeId, storeId).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 사장의 임시저장(미발송) 계약서 목록 — create() 만 되고 send() 가 안/못 된 초안 관리용.
     * (예: 발송 API 실패 후 화면을 벗어나 방치된 계약을 나중에 재발송하거나 삭제할 수 있게 한다.)
     */
    @MasterOnly
    @GetMapping("/stores/{storeId}/employees/{employeeId}/labor-contracts/drafts")
    public ResponseEntity<List<LaborContractResponse>> listDrafts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        List<LaborContractResponse> result = laborContractService.findDrafts(employeeId, storeId).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 사장이 임시저장(미발송) 계약서를 삭제한다. 이미 발송된 계약은 거부된다.
     */
    @MasterOnly
    @DeleteMapping("/stores/{storeId}/labor-contracts/{id}")
    public ResponseEntity<Void> deleteDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
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
    @MasterOnly
    @PostMapping("/stores/{storeId}/labor-contracts/{id}/send")
    public ResponseEntity<Void> send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("해당 매장의 근로계약서가 아니에요.");
        }
        // 서류함 연동 → 발송 상태 확정(markSent) → 알림 순서로 진행한다. 각각 별도 트랜잭션이므로
        // 앞 단계가 실패하면 뒤 단계가 아예 실행되지 않아 계약이 "발송 전" 상태로 안전하게 남고,
        // 재시도 시 이미 끝난 단계는 멱등하게 건너뛴다.
        // 발송 시 직원 서류함에 자동 연동 — 재발송해도 중복 생성되지 않음(멱등)
        LocalDate issuedAt = contract.getStartDate() != null ? contract.getStartDate() : LocalDate.now();
        employeeDocumentService.linkLaborContract(storeId, contract.getEmployeeId(), contract.getId(), issuedAt);
        // 발송 확정 — 이 시점부터 직원 목록·서명·PDF 조회에 노출된다(멱등, 재발송해도 최초 시각 유지).
        laborContractService.markSent(contract.getId());
        // 월급제 정규직 + 스케줄 존재 조건이면 입사 시점부터 근무 시프트를 고정 생성하기 시작한다.
        // 그 외 계약 형태는 조용히 무시(기존처럼 사장이 스케줄 보드에서 수동 등록).
        fixedScheduleService.activateFromContract(contract);
        // EmployeeProfile.id == User.id → employeeId 가 곧 알림 수신 userId
        notificationService.push(contract.getEmployeeId(), PushMessage.builder()
                .title("근로계약서가 도착했어요")
                .body("사장님이 근로계약서를 보냈어요. 내용을 확인하고 서명해 주세요.")
                .deepLink("sodam://contract")
                .data(Map.of("type", "CONTRACT_SENT"))
                .build());
        return ResponseEntity.ok().build();
    }

    /**
     * 사장이 근로계약서 PDF를 다운로드한다(§17 서면 명시·교부 의무의 전자 문서 구현).
     */
    @MasterOnly
    @GetMapping("/stores/{storeId}/labor-contracts/{id}/pdf")
    public ResponseEntity<byte[]> pdfForMaster(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
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
     * 직원 본인이 근로계약서에 서명(동의)한다. 멱등 — 중복 호출 시 최초 서명 시각 유지.
     * 서명 이미지(base64)는 선택 — 캔버스 미지원 환경은 body 없이 호출 가능.
     */
    @PostMapping("/labor-contracts/{id}/sign")
    public ResponseEntity<LaborContractResponse> sign(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) LaborContractSignRequest body) {
        String signatureImage = body != null ? body.signatureImage() : null;
        LaborContract signed = laborContractService.sign(id, principal.getId(), signatureImage);
        return ResponseEntity.ok(LaborContractResponse.from(signed));
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
