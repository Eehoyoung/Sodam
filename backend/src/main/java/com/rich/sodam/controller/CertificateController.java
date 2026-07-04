package com.rich.sodam.controller;

import com.rich.sodam.domain.type.CertificateType;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 재직/경력증명서 PDF API — 로그인한 직원 <b>본인</b>만 자기 증명서를 발급한다.
 *
 * <p>매장 소속(현재/과거) 검증은 {@link CertificateService} 에서 관계 존재 여부로 수행(미소속 403).
 * 주민등록번호는 절대 포함하지 않는다.
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
@Tag(name = "증명서", description = "재직/경력증명서 PDF 발급")
public class CertificateController {

    private final CertificateService certificateService;

    @Operation(summary = "내 증명서 PDF 다운로드",
            description = "type=EMPLOYMENT(재직) | CAREER(경력). 해당 매장 소속(현재/과거)이 아니면 403.")
    @GetMapping("/my")
    public ResponseEntity<byte[]> my(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId,
            @RequestParam CertificateType type) {
        byte[] pdfBytes = certificateService.generate(principal.getId(), storeId, type);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = (type == CertificateType.EMPLOYMENT ? "employment" : "career")
                + "_certificate_" + storeId + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(pdfBytes.length);
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
