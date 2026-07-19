package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.DeviceToken;
import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.DeviceTokenRequest;
import com.rich.sodam.repository.DeviceTokenRepository;
import com.rich.sodam.repository.NotificationInboxRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.support.AfterCommitExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
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
    private final AfterCommitExecutor afterCommitExecutor;

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
    public void notifyWorkShiftConfirmed(Long employeeUserId, String storeName, String periodLabel) {
        push(employeeUserId, PushMessage.builder()
                .title("근무 일정 확정")
                .body(String.format("%s 매장의 %s 근무 일정이 확정됐어요.", storeName, periodLabel))
                .deepLink("sodam://shifts")
                .data(Map.of("type", "SHIFT_CONFIRMED"))
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

    /**
     * 채용 제안 수신(§15.4, 260711_작업통합.md Part 2) — 직원에게.
     */
    @Async
    public void notifyJobOfferReceived(Long targetUserId, String storeName) {
        push(targetUserId, PushMessage.builder()
                .title("채용 제안 도착")
                .body(String.format("%s에서 채용 제안을 보냈어요. 확인해 보세요.", storeName))
                .deepLink("sodam://job-offers")
                .data(Map.of("type", "JOB_OFFER_RECEIVED"))
                .build());
    }

    /**
     * 채용 제안 수락/거절(§15.4) — 사장에게.
     */
    @Async
    public void notifyJobOfferResponded(Long ownerUserId, String targetName, boolean accepted) {
        push(ownerUserId, PushMessage.builder()
                .title(accepted ? "채용 제안 수락" : "채용 제안 거절")
                .body(String.format("%s 님이 채용 제안을 %s어요.", targetName, accepted ? "수락했" : "거절했"))
                .deepLink("sodam://job-offers")
                .data(Map.of("type", accepted ? "JOB_OFFER_ACCEPTED" : "JOB_OFFER_DECLINED"))
                .build());
    }

    /**
     * 구인 공고 지원 발생(§19.3, 260711_작업통합.md Part 2) — 사장에게.
     */
    @Async
    public void notifyJobApplicationReceived(Long ownerUserId, String applicantName, String storeName) {
        push(ownerUserId, PushMessage.builder()
                .title("새 지원자 도착")
                .body(String.format("%s 매장에 %s 님이 지원했어요.", storeName, applicantName))
                .deepLink("sodam://job-applications")
                .data(Map.of("type", "JOB_APPLICATION_RECEIVED"))
                .build());
    }

    /**
     * 구인 공고 지원 수락/거절(§19.3) — 지원자(직원)에게.
     */
    @Async
    public void notifyJobApplicationResponded(Long applicantUserId, String storeName, boolean accepted) {
        push(applicantUserId, PushMessage.builder()
                .title(accepted ? "지원 수락" : "지원 거절")
                .body(String.format("%s 매장에서 지원을 %s어요.", storeName, accepted ? "수락했" : "거절했"))
                .deepLink("sodam://job-applications")
                .data(Map.of("type", accepted ? "JOB_APPLICATION_ACCEPTED" : "JOB_APPLICATION_DECLINED"))
                .build());
    }

    // ── NotificationController 애플리케이션 진입점 (WP-09 2단계) ──────────────
    // 아래 메서드들은 FCM 디바이스 토큰 등록/해제, 사장→직원 커스텀 메시지, 알림함(inbox)
    // 조회를 담당한다. 위의 notify*/push 메서드(도메인 이벤트 → 푸시)와 이름이 겹치지
    // 않도록 register/unregister/inbox 접두를 사용했다.

    /** FCM 토큰 등록. 기존 토큰이면 lastSeenAt 갱신, 없으면 신규 저장. */
    @Transactional
    public void registerDeviceToken(Long userId, DeviceTokenRequest req) {
        User user = userRepository.findById(userId).orElseThrow();
        deviceTokenRepository.findByToken(req.getToken())
                .ifPresentOrElse(
                        DeviceToken::touch,
                        () -> deviceTokenRepository.save(
                                DeviceToken.of(user, req.getToken(), req.getPlatform()))
                );
    }

    /** FCM 토큰 해제. 본인 소유 토큰만 삭제(IDOR 차단은 호출측에서 소유 확인 후 위임). */
    @Transactional
    public void unregisterDeviceToken(Long userId, String token) {
        deviceTokenRepository.findByToken(token)
                .filter(dt -> dt.getUser() != null && dt.getUser().getId().equals(userId))
                .ifPresent(deviceTokenRepository::delete);
    }

    /**
     * 사장 → 직원 커스텀 메시지를 알림함(inbox)에 적재한다.
     * 대상 직원이 없으면 false 를 반환해 컨트롤러가 400 을 내리도록 한다.
     */
    @Transactional
    public boolean sendCustomInboxMessage(Long employeeUserId, String title, String message) {
        User employee = userRepository.findById(employeeUserId).orElse(null);
        if (employee == null) {
            return false;
        }
        inboxRepository.save(NotificationInbox.of(
                employee, NotificationInbox.Category.NOTICE, title, message, "sodam://home"));
        return true;
    }

    /** 알림 이력 페이지 조회. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getInboxPage(Long userId, int page, int pageSize) {
        Page<NotificationInbox> pageObj = inboxRepository.findByUser_IdOrderByCreatedAtDesc(
                userId, PageRequest.of(page, pageSize));
        return pageObj.getContent().stream().map(n -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("category", n.getCategory().name());
            m.put("title", n.getTitle());
            m.put("body", n.getBody());
            m.put("deepLink", n.getDeepLink());
            m.put("isRead", n.isRead());
            m.put("createdAt", n.getCreatedAt());
            return m;
        }).toList();
    }

    /** 읽지 않은 알림 수. */
    @Transactional(readOnly = true)
    public long countUnreadInbox(Long userId) {
        return inboxRepository.countByUser_IdAndIsReadFalse(userId);
    }

    /** 알림 읽음 처리 (본인 소유만 — findByIdAndOwner 로 소유 필터링). */
    @Transactional
    public void markInboxRead(Long id, Long userId) {
        inboxRepository.findByIdAndOwner(id, userId)
                .ifPresent(NotificationInbox::markRead);
    }

    @Transactional
    public void push(Long userId, PushMessage message) {
        // 1) 알림 이력 적재 (E-501 알림 센터용) — 트랜잭션 일부이므로 호출측이 롤백되면 함께 롤백된다.
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                NotificationInbox.Category cat = resolveCategory(message);
                inboxRepository.save(NotificationInbox.of(
                        user, cat, message.getTitle(), message.getBody(), message.getDeepLink()));
            }
        } catch (Exception e) {
            log.warn("알림 inbox 적재 실패 userId={} exceptionType={}", userId, e.getClass().getSimpleName());
        }

        // 2) 푸시 발송 — 되돌릴 수 없는 외부 부작용이므로 트랜잭션 afterCommit 에서만 실행한다.
        // 여기서 바로 보내면 호출측 트랜잭션이 이후 롤백돼도 이미 발송된 알림은 취소할 수 없다.
        afterCommitExecutor.execute(() -> sendPush(userId, message));
    }

    private void sendPush(Long userId, PushMessage message) {
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
