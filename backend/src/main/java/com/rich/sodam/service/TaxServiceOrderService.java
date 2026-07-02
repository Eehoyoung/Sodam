package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossPaymentGateway;
import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TaxPackage;
import com.rich.sodam.repository.TaxServiceOrderRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 세무 패키지 단건결제 주문·승인 서비스(대리수취).
 *
 * 흐름: 1) 주문 생성(PENDING, 금액·송객수수료 고정) → 2) FE 토스 결제창 → paymentKey 획득
 *      → 3) 서버 승인(confirm): 금액 위변조 방지(주문 금액과 일치 검증) + 멱등(이미 PAID면 그대로).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaxServiceOrderService {

    private final TaxServiceOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final TossPaymentGateway paymentGateway;

    @Transactional
    public TaxServiceOrder createOrder(Long userId, TaxPackage pkg) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));
        String orderId = "TAX_" + userId + "_" + UUID.randomUUID().toString().substring(0, 12);
        return orderRepository.save(TaxServiceOrder.create(user, pkg, orderId));
    }

    /**
     * 결제 승인. 금액은 <b>서버 보관 주문 금액</b>으로 검증(클라이언트 금액 신뢰 금지).
     */
    @Transactional
    public TaxServiceOrder confirm(Long userId, String orderId, String paymentKey, int clientAmount) {
        TaxServiceOrder order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + orderId));
        if (!order.getUser().getId().equals(userId)) {
            throw new IllegalStateException("본인 주문만 결제할 수 있습니다.");
        }
        if (order.isPaid()) {
            return order; // 멱등: 이미 승인된 주문
        }
        if (clientAmount != order.getCustomerAmount()) {
            throw new IllegalArgumentException("결제 금액이 주문 금액과 일치하지 않습니다.");
        }

        TossPaymentGateway.ConfirmResult result =
                paymentGateway.confirm(paymentKey, orderId, order.getCustomerAmount());
        if (!result.isSuccess()) {
            throw new IllegalStateException("결제 승인 실패: " + result.getFailureReason());
        }
        order.markPaid(result.getPaymentKey());
        log.info("세무 주문 결제 완료 orderId={} 매출(송객수수료)={} 예수금(세무사)={}",
                orderId, order.getReferralFee(), order.getPartnerPayable());
        return order;
    }

    @Transactional(readOnly = true)
    public List<TaxServiceOrder> myOrders(Long userId) {
        return orderRepository.findByUser_IdOrderByCreatedAtDesc(userId);
    }
}
