package com.rich.sodam.service;

import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TaxPackage;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 세무 패키지 단건결제(대리수취) 통합 테스트.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaxServiceOrderServiceTest {

    @Autowired private TaxServiceOrderService service;
    @Autowired private UserRepository userRepository;

    private User master() {
        User u = new User("tax_owner@example.com", "사장님");
        u.setUserGrade(UserGrade.MASTER);
        return userRepository.save(u);
    }

    @Test
    @DisplayName("주문 생성: 대리수취 회계(예수금=송객수수료+세무사전달분)")
    void createOrderAccounting() {
        User user = master();
        TaxServiceOrder order = service.createOrder(user.getId(), TaxPackage.INCOME_TAX_FILING);

        assertThat(order.getStatus()).isEqualTo(TaxServiceOrder.OrderStatus.PENDING);
        assertThat(order.getCustomerAmount()).isEqualTo(99_000);
        assertThat(order.getReferralFee()).isEqualTo(30_000);          // 소담 매출
        assertThat(order.getPartnerPayable()).isEqualTo(69_000);       // 세무사 전달(예수금)
        assertThat(order.getCustomerAmount())
                .isEqualTo(order.getReferralFee() + order.getPartnerPayable());
    }

    @Test
    @DisplayName("결제 승인 → PAID, 재승인은 멱등")
    void confirmThenIdempotent() {
        User user = master();
        TaxServiceOrder order = service.createOrder(user.getId(), TaxPackage.INCOME_TAX_FILING);

        TaxServiceOrder paid = service.confirm(user.getId(), order.getOrderId(), "PK_1", 99_000);
        assertThat(paid.isPaid()).isTrue();
        assertThat(paid.getPaymentKey()).isNotNull();

        // 멱등: 재호출해도 그대로 PAID
        TaxServiceOrder again = service.confirm(user.getId(), order.getOrderId(), "PK_1", 99_000);
        assertThat(again.isPaid()).isTrue();
        assertThat(service.myOrders(user.getId())).hasSize(1);
    }

    @Test
    @DisplayName("결제 금액이 주문 금액과 다르면 거부(위변조 방지)")
    void rejectsAmountTampering() {
        User user = master();
        TaxServiceOrder order = service.createOrder(user.getId(), TaxPackage.INCOME_TAX_FILING);

        assertThatThrownBy(() -> service.confirm(user.getId(), order.getOrderId(), "PK_1", 1_000))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("타인 주문은 결제할 수 없다")
    void rejectsForeignOrder() {
        User owner = master();
        User other = userRepository.save(new User("other@example.com", "타인"));
        TaxServiceOrder order = service.createOrder(owner.getId(), TaxPackage.BOOKKEEPING_MONTHLY);

        assertThatThrownBy(() -> service.confirm(other.getId(), order.getOrderId(), "PK", 99_000))
                .isInstanceOf(IllegalStateException.class);
    }
}
