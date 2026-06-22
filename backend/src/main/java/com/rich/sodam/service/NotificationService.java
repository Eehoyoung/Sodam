package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.DeviceToken;
import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.DeviceTokenRepository;
import com.rich.sodam.repository.NotificationInboxRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 도메인 이벤트 → 푸시 알림 매핑.
 *
 * 지원 이벤트:
 *   1. 직원 출근/퇴근 등록 → 사장에게
 *   2. 출퇴근 누락 의심 → 사장 + 직원
 *   3. 급여 지급 완료 → 직원
 *   4. 구독 결제 성공/실패 → 사장
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final PushNotifier pushNotifier;
    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationInboxRepository inboxRepository;
    private final UserRepository userRepository;

    @Async
    public void notifyEmployeeCheckedIn(Long ownerUserId, String employeeName, String storeName) {
        push(ownerUserId, PushMessage.builder()
                .title("출근 등록")
                .body(String.format("%s 님이 %s 매장에 출근했어요.", employeeName, storeName))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_CHECK_IN"))
                .build());
    }

    @Async
    public void notifyEmployeeCheckedOut(Long ownerUserId, String employeeName, String storeName, int workingMinutes) {
        push(ownerUserId, PushMessage.builder()
                .title("퇴근 등록")
                .body(String.format("%s 님이 %s에서 %d시간 %d분 근무 후 퇴근했어요.",
                        employeeName, storeName, workingMinutes / 60, workingMinutes % 60))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_CHECK_OUT"))
                .build());
    }

    @Async
    public void notifyAttendanceMissing(Long userId, String storeName) {
        push(userId, PushMessage.builder()
                .title("출퇴근 누락 알림")
                .body(String.format("%s 매장의 출퇴근 기록이 누락된 것 같아요. 확인해 주세요.", storeName))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_MISSING"))
                .build());
    }

    @Async
    public void notifyDocumentExpiring(Long ownerUserId, String employeeName, String docLabel, long daysLeft) {
        String when = daysLeft < 0 ? "만료됐어요" : (daysLeft == 0 ? "오늘 만료돼요" : String.format("%d일 뒤 만료돼요", daysLeft));
        push(ownerUserId, PushMessage.builder()
                .title("서류 만료 알림")
                .body(String.format("%s 님의 %s이(가) %s. 갱신을 챙겨주세요.", employeeName, docLabel, when))
                .deepLink("sodam://store")
                .data(Map.of("type", "DOCUMENT_EXPIRING"))
                .build());
    }

    @Async
    public void notifyPayrollPaid(Long employeeUserId, String storeName, int netWage, String month) {
        push(employeeUserId, PushMessage.builder()
                .title("급여 입금 완료")
                .body(String.format("%s · %s 급여 %,d원이 정산되었어요.", storeName, month, netWage))
                .deepLink("sodam://salary")
                .data(Map.of("type", "PAYROLL_PAID"))
                .build());
    }

    @Async
    public void notifyBillingSucceeded(Long ownerUserId, String planName, int amount) {
        push(ownerUserId, PushMessage.builder()
                .title("결제 완료")
                .body(String.format("%s 플랜 %,d원이 정상 결제되었어요.", planName, amount))
                .deepLink("sodam://subscription")
                .data(Map.of("type", "BILLING_SUCCESS"))
                .build());
    }

    @Async
    public void notifyBillingFailed(Long ownerUserId, String planName) {
        push(ownerUserId, PushMessage.builder()
                .title("결제 실패")
                .body(String.format("%s 플랜 결제가 실패했어요. 카드 정보를 확인해 주세요.", planName))
                .deepLink("sodam://subscription")
                .data(Map.of("type", "BILLING_FAILED"))
                .build());
    }

    /**
     * 휴면 사장 win-back(GR-NEW-05). 휴면 전환 D+7/D+30 에 복귀를 유도.
     * 외부 발신이 아니라 앱 내 알림(inbox 적재 + FCM, 수신동의 범위)이다.
     * 마케팅성 문구 — CEO 톤 검토 대상.
     */
    @Async
    public void notifyWinBack(Long ownerUserId) {
        push(ownerUserId, PushMessage.builder()
                .title("이번 달 급여, 30초면 끝나요")
                .body("사장님, 다시 오셨네요. 직원 출퇴근부터 급여 정산까지 소담이 한 번에 도와드릴게요.")
                .deepLink("sodam://home")
                .data(Map.of("type", "WIN_BACK"))
                .build());
    }

    @org.springframework.transaction.annotation.Transactional
    public void push(Long userId, PushMessage message) {
        // 1) 알림 이력 적재 (E-501 알림 센터용)
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                NotificationInbox.Category cat = resolveCategory(message);
                inboxRepository.save(NotificationInbox.of(
                        user, cat, message.getTitle(), message.getBody(), message.getDeepLink()));
            }
        } catch (Exception e) {
            log.warn("알림 inbox 적재 실패 userId={} reason={}", userId, e.getMessage());
        }

        // 2) 푸시 발송
        List<DeviceToken> tokens = deviceTokenRepository.findByUser_Id(userId);
        if (tokens.isEmpty()) {
            log.debug("푸시 대상 디바이스 없음 userId={}", userId);
            return;
        }
        List<String> rawTokens = tokens.stream().map(DeviceToken::getToken).toList();
        PushNotifier.SendResult res = pushNotifier.sendToTokens(rawTokens, message);
        log.debug("푸시 발송 userId={} success={} fail={}",
                userId, res.getSuccessCount(), res.getFailureCount());
    }

    private NotificationInbox.Category resolveCategory(PushMessage m) {
        String type = m.getData() != null ? m.getData().get("type") : null;
        if (type == null) return NotificationInbox.Category.SYSTEM;
        if (type.startsWith("ATTENDANCE_")) return NotificationInbox.Category.ATTENDANCE;
        if (type.startsWith("PAYROLL_")) return NotificationInbox.Category.PAYROLL;
        if (type.startsWith("BILLING_")) return NotificationInbox.Category.BILLING;
        if (type.equals("MARKETING") || type.equals("WIN_BACK")) return NotificationInbox.Category.MARKETING;
        return NotificationInbox.Category.NOTICE;
    }
}
