package com.rich.sodam.controller;

import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.type.TaxPackage;
import com.rich.sodam.dto.request.TaxOrderConfirmRequest;
import com.rich.sodam.dto.response.TaxOrderResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.TaxServiceOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 세무 패키지 단건결제 API(대리수취). 확정안 §4-1·§5.
 *
 * 흐름: 1) POST /tax-orders (주문 생성) → 2) FE 토스 결제창 → 3) POST /tax-orders/{orderId}/confirm.
 * 소담은 SW+송객만 — 신고·계산은 세무사. 매출은 송객수수료만 인식(대리수취).
 */
@MasterOnly
@RestController
@RequestMapping("/api/billing/tax-orders")
@RequiredArgsConstructor
@Tag(name = "구독·결제", description = "세무 패키지 단건결제(송객)")
public class TaxServiceOrderController {

    private final TaxServiceOrderService taxServiceOrderService;

    @Operation(summary = "세무 패키지 주문 생성", description = "PENDING 주문 생성 후 orderId/amount 반환. FE는 이 값으로 토스 결제창 호출.")
    @PostMapping
    public ResponseEntity<TaxOrderResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam TaxPackage packageType) {
        TaxServiceOrder order = taxServiceOrderService.createOrder(principal.getId(), packageType);
        return ResponseEntity.ok(TaxOrderResponse.from(order));
    }

    @Operation(summary = "세무 패키지 결제 승인", description = "토스 결제창 성공 후 paymentKey 로 서버 최종 승인.")
    @PostMapping("/{orderId}/confirm")
    public ResponseEntity<TaxOrderResponse> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String orderId,
            @Valid @RequestBody TaxOrderConfirmRequest req) {
        TaxServiceOrder order = taxServiceOrderService.confirm(
                principal.getId(), orderId, req.getPaymentKey(), req.getAmount());
        return ResponseEntity.ok(TaxOrderResponse.from(order));
    }

    @Operation(summary = "내 세무 주문 목록")
    @GetMapping("/me")
    public ResponseEntity<List<TaxOrderResponse>> myOrders(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<TaxOrderResponse> list = taxServiceOrderService.myOrders(principal.getId()).stream()
                .map(TaxOrderResponse::from).toList();
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "세무 패키지 카탈로그")
    @GetMapping("/packages")
    public ResponseEntity<List<java.util.Map<String, Object>>> packages() {
        List<java.util.Map<String, Object>> list = new java.util.ArrayList<>();
        for (TaxPackage p : TaxPackage.values()) {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("name", p.name());
            m.put("displayName", p.getDisplayName());
            m.put("amount", p.getCustomerAmount());
            list.add(m);
        }
        return ResponseEntity.ok(list);
    }
}
