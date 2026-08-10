package com.rich.sodam.service;

import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PaymentSourceType;
import com.rich.sodam.domain.type.TaxPackage;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.PaymentReceiptRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * G-11 세무 증빙 live 발급 <b>선결 2건</b>의 배선을 검증한다.
 *
 * <ol>
 *   <li><b>선결 1 — 대리수취 과세표준</b>: 세무 서비스는
 *       {@code customerAmount = referralFee(소담 매출) + partnerPayable(세무사 전달분)} 구조라,
 *       전액을 공급가액으로 발급하면 부가세 과세표준이 실매출보다 과대계상된다.
 *       증빙에 예수금을 따로 담아 과세표준을 분리한다</li>
 *   <li><b>선결 2 — 수정세금계산서 경로</b>: 이미 발급된 증빙이 환불되면 내부 상태만
 *       CANCELLED 로 바꿔서는 안 된다(부가가치세법 시행령 §70). 취소·수정 통지가 성공해야
 *       CANCELLED 로 종결되고, 실패하면 {@code AMEND_PENDING} 으로 남아 미이행이 드러난다</li>
 * </ol>
 *
 * <p>⚠️ 어느 쪽 금액을 실제 공급가액으로 발급할지는 <b>G-11 Q1·Q2 세무사 회신 사항</b>이다.
 * 이 테스트는 "무엇을 발급하느냐"가 아니라 <b>판단에 필요한 값이 보존되고, 수정 경로가 존재하는지</b>를
 * 고정한다. 운영 기본값은 {@code default-document-type=NONE} 이라 실제 발급은 일어나지 않는다 —
 * 여기서는 발급 경로를 태우기 위해 명시적으로 켠다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "sodam.fiscal-receipt.default-document-type=CASH_RECEIPT")
class PaymentReceiptAmendmentTest {

    @Autowired private UserRepository userRepository;
    @Autowired private TaxServiceOrderService taxServiceOrderService;
    @Autowired private AttendanceCreditChargeService attendanceCreditChargeService;
    @Autowired private PaymentRefundService refundService;
    @Autowired private PaymentReceiptRepository receiptRepository;

    private User owner() {
        User user = new User("receipt-amend-" + UUID.randomUUID() + "@x.com", "사장");
        user.setUserGrade(UserGrade.MASTER);
        return userRepository.save(user);
    }

    @Test
    @DisplayName("세무 서비스 증빙은 예수금을 분리 보관해 과세표준이 실매출(송객수수료)로 잡힌다")
    void 세무서비스_증빙은_예수금을_분리해_과세표준을_잡는다() {
        User user = owner();
        TaxServiceOrder order = taxServiceOrderService.createOrder(user.getId(), TaxPackage.BOOKKEEPING_MONTHLY);
        taxServiceOrderService.confirm(user.getId(), order.getOrderId(), "TAX_PK", order.getCustomerAmount());

        PaymentReceipt receipt = receiptRepository
                .findBySourceTypeAndSourceOrderId(PaymentSourceType.TAX_SERVICE, order.getOrderId())
                .orElseThrow();

        // 결제·환불 금액은 여전히 사장님이 낸 전액이다 — 이걸 줄이면 PG 취소 금액이 어긋난다.
        assertThat(receipt.getAmountKrw()).isEqualTo(order.getCustomerAmount());
        assertThat(receipt.getPassThroughAmountKrw())
                .as("세무사 전달분은 소담 매출이 아니라 예수금이다")
                .isEqualTo(order.getPartnerPayable())
                .isPositive();
        assertThat(receipt.taxableAmountKrw())
                .as("과세표준 후보는 송객수수료(실매출)뿐이다")
                .isEqualTo(order.getReferralFee());
        assertThat(receipt.taxableAmountKrw())
                .as("전액을 공급가액으로 쓰면 과대계상 — 이 둘이 같아지면 회귀다")
                .isNotEqualTo(receipt.getAmountKrw());
    }

    @Test
    @DisplayName("대리수취가 없는 과금은 수취액 전액이 그대로 과세표준이다")
    void 일반_과금은_전액이_과세표준이다() {
        User user = owner();
        var order = attendanceCreditChargeService.createOrder(user.getId(),
                com.rich.sodam.domain.type.AttendanceCreditChargePackCode.SMALL);
        attendanceCreditChargeService.confirm(user.getId(), order.getOrderId(), "ACC_PK", order.getAmountKrw());

        PaymentReceipt receipt = receiptRepository
                .findBySourceTypeAndSourceOrderId(PaymentSourceType.ATTENDANCE_CREDIT_CHARGE, order.getOrderId())
                .orElseThrow();

        assertThat(receipt.getPassThroughAmountKrw()).isZero();
        assertThat(receipt.taxableAmountKrw()).isEqualTo(receipt.getAmountKrw());
    }

    @Test
    @DisplayName("발급된 증빙이 환불되면 수정세금계산서 통지를 거쳐야만 CANCELLED 로 종결된다")
    void 발급된_증빙의_환불은_수정통지를_거친다() {
        User user = owner();
        var order = attendanceCreditChargeService.createOrder(user.getId(),
                com.rich.sodam.domain.type.AttendanceCreditChargePackCode.SMALL);
        attendanceCreditChargeService.confirm(user.getId(), order.getOrderId(), "ACC_PK", order.getAmountKrw());

        // 발급까지 끝난 상태여야 수정 경로가 의미를 갖는다
        assertThat(receiptRepository
                .findBySourceTypeAndSourceOrderId(PaymentSourceType.ATTENDANCE_CREDIT_CHARGE, order.getOrderId())
                .orElseThrow().getStatus()).isEqualTo(PaymentReceipt.Status.ISSUED);

        refundService.request(user.getId(), PaymentSourceType.ATTENDANCE_CREDIT_CHARGE,
                order.getOrderId(), "수정발급 경로 검증");

        PaymentReceipt receipt = receiptRepository
                .findBySourceTypeAndSourceOrderId(PaymentSourceType.ATTENDANCE_CREDIT_CHARGE, order.getOrderId())
                .orElseThrow();
        assertThat(receipt.getStatus()).isEqualTo(PaymentReceipt.Status.CANCELLED);
        assertThat(receipt.getAmendmentReference())
                .as("수정세금계산서 통지 참조번호가 남아야 §70 이행을 증명할 수 있다")
                .isNotBlank();
        assertThat(receipt.getAmendedAt()).isNotNull();
    }

    @Test
    @DisplayName("세무 서비스처럼 취소 경로가 둘인 과금도 수정 통지가 한 번은 반드시 완료된다")
    void 취소경로가_둘이어도_수정통지가_유실되지_않는다() {
        User user = owner();
        TaxServiceOrder order = taxServiceOrderService.createOrder(user.getId(), TaxPackage.BOOKKEEPING_MONTHLY);
        taxServiceOrderService.confirm(user.getId(), order.getOrderId(), "TAX_PK", order.getCustomerAmount());

        // 환불 처리기는 주문 취소(내부에서 증빙 취소를 호출)와 증빙 취소를 연달아 부른다.
        // 두 번째 호출이 대기 중인 수정 통지를 덮으면 §70 미이행이 조용히 남는다.
        refundService.request(user.getId(), PaymentSourceType.TAX_SERVICE, order.getOrderId(), "이중 취소 경로");

        PaymentReceipt receipt = receiptRepository
                .findBySourceTypeAndSourceOrderId(PaymentSourceType.TAX_SERVICE, order.getOrderId())
                .orElseThrow();
        assertThat(receipt.getStatus()).isEqualTo(PaymentReceipt.Status.CANCELLED);
        assertThat(receipt.getAmendmentReference()).isNotBlank();
    }

    @Test
    @DisplayName("발급되지 않은 증빙(발급 대상 NONE 등)은 수정 통지 없이 그대로 취소된다")
    void 미발급_증빙은_수정통지_없이_취소된다() {
        // 발급 대상이 NONE 이면 status 가 POLICY_PENDING 이라 통지할 원본 자체가 없다.
        PaymentReceipt receipt = PaymentReceipt.create(PaymentSourceType.SUBSCRIPTION, "ORDER_NONE_" + UUID.randomUUID(),
                1L, "PK", 10_000, com.rich.sodam.domain.type.FiscalDocumentType.NONE);

        assertThat(receipt.getStatus()).isEqualTo(PaymentReceipt.Status.POLICY_PENDING);
        assertThat(receipt.requiresAmendment()).isFalse();

        receipt.markCancelled();
        assertThat(receipt.getStatus()).isEqualTo(PaymentReceipt.Status.CANCELLED);
        assertThat(receipt.getAmendmentReference()).isNull();
    }
}
