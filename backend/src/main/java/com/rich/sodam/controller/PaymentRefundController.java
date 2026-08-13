package com.rich.sodam.controller;

import com.rich.sodam.dto.request.PaymentRefundRequestCreate;
import com.rich.sodam.dto.response.PaymentReceiptResponse;
import com.rich.sodam.dto.response.PaymentRefundRequestResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.PaymentReceiptService;
import com.rich.sodam.service.PaymentRefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** 결제 상품 네 종류의 환불 신청·세무 증빙 조회 API. */
@MasterOnly
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Tag(name = "구독·결제", description = "환불 신청과 세무 증빙 상태")
public class PaymentRefundController {
    private final PaymentRefundService paymentRefundService;
    private final PaymentReceiptService paymentReceiptService;

    @Operation(summary = "결제 환불 신청", description = "서버의 결제 원본·소유권을 대조한 뒤 PG 취소와 기존 회수 로직을 실행합니다.")
    @PostMapping("/refunds")
    public ResponseEntity<PaymentRefundRequestResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @Valid @RequestBody PaymentRefundRequestCreate request) {
        Long requestId = paymentRefundService.request(principal.getId(), request.getSourceType(), request.getOrderId(),
                request.getReason()).getId();
        return ResponseEntity.status(201).body(PaymentRefundRequestResponse.from(paymentRefundService.findById(requestId)));
    }
    @Operation(summary = "내 환불 신청 목록")
    @GetMapping("/refunds/me")
    public ResponseEntity<List<PaymentRefundRequestResponse>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(paymentRefundService.myRequests(principal.getId()).stream().map(PaymentRefundRequestResponse::from).toList());
    }
    @Operation(summary = "내 세금계산서·현금영수증 발급 상태")
    @GetMapping("/receipts/me")
    public ResponseEntity<List<PaymentReceiptResponse>> receipts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(paymentReceiptService.myReceipts(principal.getId()).stream().map(PaymentReceiptResponse::from).toList());
    }
}
