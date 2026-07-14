package com.rich.sodam.controller;

import com.rich.sodam.dto.request.CustomerInquiryCreateRequest;
import com.rich.sodam.dto.response.CustomerInquiryResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.AnyAuthenticated;
import com.rich.sodam.service.CustomerInquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Q&A 화면 1:1 문의 (findings_report.md §1-3). 공개 팁/FAQ 콘텐츠(QnaInfoController)와는 별개.
 */
@AnyAuthenticated
@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
@Tag(name = "1:1 문의", description = "고객 1:1 문의 접수 API")
public class CustomerInquiryController {

    private final CustomerInquiryService customerInquiryService;

    @Operation(summary = "1:1 문의 접수")
    @PostMapping
    public ResponseEntity<CustomerInquiryResponse> submit(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CustomerInquiryCreateRequest req) {
        CustomerInquiryResponse response = customerInquiryService.submit(principal.getId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
