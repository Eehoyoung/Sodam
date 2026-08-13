package com.rich.sodam.service;

import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PaymentSourceType;
import com.rich.sodam.domain.type.TaxPackage;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.PaymentReceiptRepository;
import com.rich.sodam.repository.TaxServiceOrderRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class TossWebhookServiceTaxServiceOrderTest {

    @Autowired private TossWebhookService webhookService;
    @Autowired private TaxServiceOrderService taxServiceOrderService;
    @Autowired private TaxServiceOrderRepository orderRepository;
    @Autowired private PaymentReceiptRepository receiptRepository;
    @Autowired private UserRepository userRepository;

    private User master() {
        User user = new User("tax-webhook-" + UUID.randomUUID() + "@x.com", "사장");
        user.setUserGrade(UserGrade.MASTER);
        return userRepository.save(user);
    }

    private String cancelPayload(String orderId, String paymentKey, String status) {
        return "{\"eventType\":\"PAYMENT_STATUS_CHANGED\",\"data\":{"
                + "\"paymentKey\":\"" + paymentKey + "\","
                + "\"orderId\":\"" + orderId + "\","
                + "\"status\":\"" + status + "\"}}";
    }

    @Test
    void canceledAndPartialCanceledTaxOrderRefundAndCancelReceipt() throws Exception {
        User user = master();
        for (String status : new String[]{"CANCELED", "PARTIAL_CANCELED"}) {
            TaxServiceOrder order = taxServiceOrderService.createOrder(user.getId(), TaxPackage.INCOME_TAX_FILING);
            taxServiceOrderService.confirm(user.getId(), order.getOrderId(), "PK_" + status, order.getCustomerAmount());

            webhookService.processWebhookPayload(cancelPayload(order.getOrderId(), "PK_" + status, status));

            assertThat(orderRepository.findByOrderId(order.getOrderId()).orElseThrow().getStatus())
                    .isEqualTo(TaxServiceOrder.OrderStatus.REFUNDED);
            assertThat(receiptRepository.findBySourceTypeAndSourceOrderId(PaymentSourceType.TAX_SERVICE, order.getOrderId())
                    .orElseThrow().getStatus()).isEqualTo(PaymentReceipt.Status.CANCELLED);
        }
    }
}
