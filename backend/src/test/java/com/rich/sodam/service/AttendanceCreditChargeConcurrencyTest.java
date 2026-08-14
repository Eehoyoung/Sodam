package com.rich.sodam.service;

import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceCreditChargeOrderRepository;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AttendanceCreditChargeConcurrencyTest {

    @Autowired private AttendanceCreditChargeService chargeService;
    @Autowired private AttendanceCreditRepository walletRepository;
    @Autowired private AttendanceCreditChargeOrderRepository orderRepository;
    @Autowired private UserRepository userRepository;

    @Test
    @DisplayName("웹훅 승인과 FE confirm이 동시에 도착해도 출근권은 한 번만 지급된다")
    void webhookAndFrontendConfirm_concurrently_grantOnce() throws Exception {
        User owner = new User("attendance-credit-race-" + UUID.randomUUID() + "@x.com", "사장");
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);
        Long ownerId = owner.getId();
        AttendanceCreditChargeOrder order = chargeService.createOrder(
                ownerId, AttendanceCreditChargePackCode.SMALL);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> frontend = executor.submit(() -> {
                await(ready, start);
                chargeService.confirm(ownerId, order.getOrderId(), "PK_RACE", order.getAmountKrw());
            });
            Future<?> webhook = executor.submit(() -> {
                await(ready, start);
                chargeService.applyFromWebhook(order.getOrderId(), "PK_RACE");
            });
            ready.await();
            start.countDown();
            frontend.get();
            webhook.get();
        } finally {
            executor.shutdownNow();
        }

        AttendanceCredit wallet = walletRepository.findByOwnerUserId(ownerId).orElseThrow();
        AttendanceCreditChargeOrder paid = orderRepository.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(paid.isPaid()).isTrue();
        assertThat(wallet.getBalance()).isEqualTo(20);
    }

    private static void await(CountDownLatch ready, CountDownLatch start) {
        try {
            ready.countDown();
            start.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
