package com.rich.sodam.service;

import com.rich.sodam.config.integration.MockPushNotifier;
import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.DeviceToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.DeviceTokenRepository;
import com.rich.sodam.repository.NotificationInboxRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 알림 발행의 트랜잭션 {@code afterCommit} 보장 회귀 테스트(260711_작업통합.md Part 2 §15.4·§19.3,
 * "롤백 시 미발행"). {@link JobOfferService}/{@link JobApplicationService} 의 모든 알림 호출은
 * {@link NotificationService#push} 를 경유하므로, 그 공유 지점 하나만 검증하면 충분하다.
 *
 * <p>클래스 레벨 {@code @Transactional} 을 의도적으로 사용하지 않는다 — 테스트 프레임워크의 자동
 * 롤백 트랜잭션 안에서는 {@link TransactionTemplate} 이 기본 전파(REQUIRED)로 "합류"만 할 뿐 실제
 * 커밋이 발생하지 않아 {@code afterCommit} 콜백 자체를 관찰할 수 없다. 여기서는 픽스처를 먼저 독립
 * 커밋시킨 뒤, 검증 대상 호출만 별도 트랜잭션(TransactionTemplate 기본 REQUIRED, 외부 tx 없음 →
 * 신규 물리 트랜잭션)으로 감싼다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class NotificationAfterCommitTest {

    @Autowired private NotificationService notificationService;
    @Autowired private UserRepository userRepo;
    @Autowired private NotificationInboxRepository notificationInboxRepo;
    @Autowired private DeviceTokenRepository deviceTokenRepo;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired(required = false) private MockPushNotifier mockPushNotifier;

    private Long createdUserId;

    @AfterEach
    void cleanup() {
        if (createdUserId != null) {
            deviceTokenRepo.findByUser_Id(createdUserId).forEach(deviceTokenRepo::delete);
            notificationInboxRepo.findByUser_IdOrderByCreatedAtDesc(createdUserId, Pageable.unpaged())
                    .forEach(notificationInboxRepo::delete);
            userRepo.deleteById(createdUserId);
            createdUserId = null;
        }
    }

    private User fixtureUser(String label) {
        User u = new User(label + System.nanoTime() + "@x.com", "알림테스트");
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u); // 독립 커밋(REQUIRED, 외부 tx 없음) — 아래 검증 트랜잭션에서 조회 가능해야 함
        createdUserId = u.getId();
        return u;
    }

    private PushMessage testMessage() {
        return PushMessage.builder()
                .title("테스트 알림")
                .body("afterCommit 검증")
                .deepLink("sodam://test")
                .data(Map.of("type", "JOB_OFFER_RECEIVED"))
                .build();
    }

    @Test
    @DisplayName("트랜잭션 롤백 시 알림 inbox 미적재, 푸시 미발송 — afterCommit 보장")
    void push_rollback_doesNotNotify() {
        User target = fixtureUser("rollback_target");
        deviceTokenRepo.save(DeviceToken.of(target, "token-rollback-" + target.getId(), DeviceToken.Platform.ANDROID));
        int before = mockPushNotifier != null ? mockPushNotifier.getSentCount() : 0;

        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.execute(status -> {
            notificationService.push(target.getId(), testMessage());
            status.setRollbackOnly();
            return null;
        });

        assertThat(notificationInboxRepo.findByUser_IdOrderByCreatedAtDesc(target.getId(), Pageable.unpaged())
                .getTotalElements()).isZero();
        if (mockPushNotifier != null) {
            assertThat(mockPushNotifier.getSentCount()).isEqualTo(before);
        }
    }

    @Test
    @DisplayName("트랜잭션 정상 커밋 시 알림 inbox 적재 + 푸시 발송(대조군)")
    void push_commit_doesNotify() {
        User target = fixtureUser("commit_target");
        deviceTokenRepo.save(DeviceToken.of(target, "token-commit-" + target.getId(), DeviceToken.Platform.ANDROID));
        int before = mockPushNotifier != null ? mockPushNotifier.getSentCount() : 0;

        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.execute(status -> {
            notificationService.push(target.getId(), testMessage());
            return null;
        });

        assertThat(notificationInboxRepo.findByUser_IdOrderByCreatedAtDesc(target.getId(), Pageable.unpaged())
                .getTotalElements()).isEqualTo(1);
        if (mockPushNotifier != null) {
            assertThat(mockPushNotifier.getSentCount()).isEqualTo(before + 1);
        }
    }
}
