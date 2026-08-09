package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** mock 결제에서 네 상품의 성공→증빙과 환불 신청→취소 반영을 함께 검증한다. */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "sodam.fiscal-receipt.default-document-type=CASH_RECEIPT")
class PaymentRefundAndReceiptServiceTest {
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionService subscriptionService;
    @Autowired private AttendanceCreditChargeService attendanceService;
    @Autowired private RecruitmentBoostPassService boostService;
    @Autowired private TaxServiceOrderService taxService;
    @Autowired private PaymentReceiptRepository receiptRepository;
    @Autowired private PaymentRefundService refundService;
    @Autowired private AttendanceCreditChargeOrderRepository attendanceOrderRepository;

    private User owner() {
        User user = new User("payment-flow-" + UUID.randomUUID() + "@x.com", "사장");
        user.setUserGrade(UserGrade.MASTER);
        return userRepository.save(user);
    }

    @Test
    @DisplayName("네 과금 상품 모두 성공 결제 후 afterCommit 증빙이 한 번씩 발급된다")
    void allPaidSourcesCreateOneReceipt() {
        User user = owner();
        Subscription subscription = subscriptionService.subscribe(user.getId(), PlanType.STARTER, "MOCK_AUTH");
        AttendanceCreditChargeOrder attendance = attendanceService.createOrder(user.getId(), AttendanceCreditChargePackCode.SMALL);
        attendanceService.confirm(user.getId(), attendance.getOrderId(), "ACC_PK", attendance.getAmountKrw());
        RecruitmentBoostPassOrder boost = boostService.createOrder(user.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        boostService.confirm(user.getId(), boost.getOrderId(), "RBP_PK", boost.getAmountKrw());
        TaxServiceOrder tax = taxService.createOrder(user.getId(), TaxPackage.BOOKKEEPING_MONTHLY);
        taxService.confirm(user.getId(), tax.getOrderId(), "TAX_PK", tax.getCustomerAmount());

        assertThat(receiptRepository.findByOwnerUserIdOrderByCreatedAtDesc(user.getId()))
                .extracting(PaymentReceipt::getSourceType)
                .containsExactlyInAnyOrder(PaymentSourceType.SUBSCRIPTION, PaymentSourceType.ATTENDANCE_CREDIT_CHARGE,
                        PaymentSourceType.RECRUITMENT_BOOST_PASS, PaymentSourceType.TAX_SERVICE);
        assertThat(receiptRepository.findByOwnerUserIdOrderByCreatedAtDesc(user.getId()))
                .allMatch(receipt -> receipt.getStatus() == PaymentReceipt.Status.ISSUED);
        assertThat(subscription.isActive()).isTrue();
    }

    @Test
    @DisplayName("mock 출근권 결제는 본인 환불 신청 후 기존 비례 회수 경로로 REFUNDED가 되고 중복 신청은 막힌다")
    void mockRefundCompletesAndRejectsDuplicate() {
        User user = owner();
        AttendanceCreditChargeOrder order = attendanceService.createOrder(user.getId(), AttendanceCreditChargePackCode.SMALL);
        attendanceService.confirm(user.getId(), order.getOrderId(), "ACC_PK", order.getAmountKrw());

        PaymentRefundRequest request = refundService.request(user.getId(), PaymentSourceType.ATTENDANCE_CREDIT_CHARGE,
                order.getOrderId(), "테스트 환불");

        assertThat(refundService.myRequests(user.getId()).get(0).getStatus()).isEqualTo(PaymentRefundRequest.Status.COMPLETED);
        assertThat(attendanceOrderRepository.findByOrderId(order.getOrderId()).orElseThrow().getStatus())
                .isEqualTo(AttendanceCreditChargeOrder.ChargeOrderStatus.REFUNDED);
        assertThat(receiptRepository.findBySourceTypeAndSourceOrderId(PaymentSourceType.ATTENDANCE_CREDIT_CHARGE, order.getOrderId())
                .orElseThrow().getStatus()).isEqualTo(PaymentReceipt.Status.CANCELLED);
        assertThat(refundService.request(user.getId(), PaymentSourceType.ATTENDANCE_CREDIT_CHARGE,
                order.getOrderId(), "중복").getId()).isEqualTo(request.getId());
    }

    @Test
    @DisplayName("타인 결제 주문은 환불 신청할 수 없다")
    void foreignOrderIsRejected() {
        User owner = owner();
        User other = owner();
        AttendanceCreditChargeOrder order = attendanceService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        attendanceService.confirm(owner.getId(), order.getOrderId(), "ACC_PK", order.getAmountKrw());
        assertThatThrownBy(() -> refundService.request(other.getId(), PaymentSourceType.ATTENDANCE_CREDIT_CHARGE,
                order.getOrderId(), "타인 시도"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
