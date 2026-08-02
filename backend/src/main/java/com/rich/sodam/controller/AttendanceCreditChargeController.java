package com.rich.sodam.controller;

import com.rich.sodam.config.AttendanceCreditProperties;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.dto.request.AttendanceCreditChargeConfirmRequest;
import com.rich.sodam.dto.response.AttendanceCreditChargeCatalogResponse;
import com.rich.sodam.dto.response.AttendanceCreditChargeOrderResponse;
import com.rich.sodam.dto.response.AttendanceCreditChargePackResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.AttendanceCreditChargeService;
import com.rich.sodam.service.AttendanceCreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 출근권 충전소(IAP) API — 사장 전용 채용 재화 단건결제(recruitment-monetization-gamification-plan.md
 * §2.4, §7).
 *
 * <p>흐름: 1) {@code GET /packs} 카탈로그 확인 → 2) {@code POST /orders} PENDING 주문 생성(orderId/금액
 * 반환) → 3) FE 토스 결제창 → 4) {@code POST /orders/{orderId}/confirm} 서버 최종 승인.
 * {@link AttendanceCreditController}와 동일하게 사용자(사장) 스코프 리소스라 {@code StoreAccessGuard}가
 * 불필요하다 — JWT principal의 userId만으로 본인 지갑/주문을 조작하므로 BOLA 여지가 없다.</p>
 */
@MasterOnly
@RestController
@RequestMapping("/api/attendance-credits/charge")
@RequiredArgsConstructor
@Tag(name = "출근권(AttendanceCredit)", description = "출근권 충전소(IAP) — 단건결제 상품 카탈로그/주문/승인")
public class AttendanceCreditChargeController {

    private final AttendanceCreditChargeService chargeService;
    private final AttendanceCreditService attendanceCreditService;
    private final AttendanceCreditProperties properties;

    @Operation(summary = "충전 상품 카탈로그",
            description = "스몰/미디엄/라지 팩 + 스트릭 복구권 목록과 가격(설정값, 운영 중 조정 가능)을 반환합니다. "
                    + "firstPurchaseBonusAvailable로 이 사장의 첫 구매 2배 이벤트 잔여 여부를 함께 내려줍니다.")
    @GetMapping("/packs")
    public ResponseEntity<AttendanceCreditChargeCatalogResponse> packs(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<AttendanceCreditChargePackResponse> packs = chargeService.packCatalog().stream()
                .map(AttendanceCreditChargePackResponse::from)
                .toList();
        boolean bonusAvailable = attendanceCreditService.isFirstChargeBonusAvailable(principal.getId());
        AttendanceCreditProperties.Charge chargeProps = properties.getCharge();
        return ResponseEntity.ok(new AttendanceCreditChargeCatalogResponse(
                packs, bonusAvailable, chargeProps.getFirstPurchaseBonusMultiplier(), chargeProps.isPromoCopyEnabled()));
    }

    @Operation(summary = "충전 주문 생성", description = "PENDING 주문 생성 후 orderId/금액 반환. FE는 이 값으로 토스 결제창 호출.")
    @PostMapping("/orders")
    public ResponseEntity<AttendanceCreditChargeOrderResponse> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam AttendanceCreditChargePackCode packCode) {
        AttendanceCreditChargeOrder order = chargeService.createOrder(principal.getId(), packCode);
        return ResponseEntity.ok(AttendanceCreditChargeOrderResponse.from(order));
    }

    @Operation(summary = "충전 결제 승인", description = "토스 결제창 성공 후 paymentKey로 서버 최종 승인 → 출근권 즉시 지급.")
    @PostMapping("/orders/{orderId}/confirm")
    public ResponseEntity<AttendanceCreditChargeOrderResponse> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String orderId,
            @Valid @RequestBody AttendanceCreditChargeConfirmRequest req) {
        AttendanceCreditChargeOrder order = chargeService.confirm(
                principal.getId(), orderId, req.getPaymentKey(), req.getAmount());
        return ResponseEntity.ok(AttendanceCreditChargeOrderResponse.from(order));
    }

    @Operation(summary = "내 충전 주문 목록")
    @GetMapping("/orders/me")
    public ResponseEntity<List<AttendanceCreditChargeOrderResponse>> myOrders(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<AttendanceCreditChargeOrderResponse> list = chargeService.myOrders(principal.getId()).stream()
                .map(AttendanceCreditChargeOrderResponse::from).toList();
        return ResponseEntity.ok(list);
    }
}
