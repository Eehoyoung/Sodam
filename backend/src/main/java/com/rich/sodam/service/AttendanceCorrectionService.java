package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCorrectionRequest;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 출퇴근 정정 요청 워크플로 (직원 → 사장 승인) 애플리케이션 서비스.
 *
 * <p>인가 검증(BOLA 가드)은 컨트롤러 책임이며, 여기서는 정정 요청 생성/조회/승인/거절과
 * 그에 따르는 알림 발송 로직만 담당한다. WP-09 2단계: 컨트롤러에서 repository 직접 접근을
 * 이관(behavior-preserving).
 */
@Service
@RequiredArgsConstructor
public class AttendanceCorrectionService {

    private final AttendanceCorrectionRequestRepository correctionRepo;
    private final AttendanceRepository attendanceRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;
    private final ManagerSupervisionNotificationService supervision;

    /** 정정 요청 생성 결과 — 컨트롤러가 그대로 응답을 조립할 수 있도록 필요한 값만 담는다. */
    public record CorrectionRequestResult(Long id, String status, boolean forbidden) {
    }

    @Transactional
    public CorrectionRequestResult requestCorrection(
            Long attendanceId, Long requesterUserId,
            LocalDateTime proposedCheckIn, LocalDateTime proposedCheckOut, String reason) {
        Attendance attendance = attendanceRepo.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("출퇴근 기록을 찾을 수 없어요."));
        User requester = userRepo.findById(requesterUserId)
                .orElseThrow();
        // 본인 기록인지 확인
        if (attendance.getEmployeeProfile() == null
                || attendance.getEmployeeProfile().getUser() == null
                || !attendance.getEmployeeProfile().getUser().getId().equals(requesterUserId)) {
            return new CorrectionRequestResult(null, null, true);
        }
        AttendanceCorrectionRequest req = correctionRepo.save(
                AttendanceCorrectionRequest.create(
                        attendance, requester,
                        proposedCheckIn, proposedCheckOut,
                        reason));

        // 사장에게 알림 — 매장 기준 (단순화: 별도 알림 메시지)
        // TODO[P2]: 사장 매장 관계 조회 후 모든 사장에게 발송
        return new CorrectionRequestResult(req.getId(), req.getStatus().name(), false);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myCorrections(Long requesterUserId) {
        return correctionRepo.findByRequester_IdOrderByRequestedAtDesc(requesterUserId)
                .stream().map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("attendanceId", r.getAttendance() != null ? r.getAttendance().getId() : null);
                    m.put("proposedCheckIn", r.getProposedCheckIn());
                    m.put("proposedCheckOut", r.getProposedCheckOut());
                    m.put("reason", r.getReason());
                    m.put("status", r.getStatus().name());
                    m.put("rejectReason", r.getRejectReason());
                    m.put("requestedAt", r.getRequestedAt());
                    m.put("decidedAt", r.getDecidedAt());
                    return m;
                }).toList();
    }

    /**
     * 정정 요청 승인. 매장 소유/전결 권한 검증은 컨트롤러(가드)에서 이미 끝난 상태로 호출된다.
     * 승인 대상 매장 id 는 컨트롤러가 가드 통과 후 넘기지만, 실제 갱신은 정정 요청에 연결된
     * Attendance 기준으로 수행한다(원본 로직과 동일).
     */
    @Transactional
    public AttendanceCorrectionRequest approve(Long id, Long approverUserId) {
        AttendanceCorrectionRequest req = correctionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없어요."));

        Attendance att = req.getAttendance();
        if (att == null || att.getStore() == null) {
            throw new IllegalArgumentException("정정 대상 매장을 확인할 수 없어요.");
        }
        if (req.getProposedCheckIn() != null) {
            att.adjustTimes(req.getProposedCheckIn(), req.getProposedCheckOut());
            attendanceRepo.save(att);
        }
        req.approve();

        if (req.getRequester() != null) {
            notificationService.push(req.getRequester().getId(),
                    PushNotifier.PushMessage.builder()
                            .title("정정 요청이 승인됐어요")
                            .body("사장님이 정정 요청을 승인했어요. 출퇴근 기록이 업데이트됐어요.")
                            .deepLink("sodam://attendance")
                            .data(Map.of("type", "ATTENDANCE_CORRECTION_APPROVED"))
                            .build());
        }
        supervision.notifyIfManager(approverUserId, att.getStore().getId(), "출퇴근 정정 승인");
        return req;
    }

    /**
     * 정정 요청 거절. 매장 소유/전결 권한 검증은 컨트롤러(가드)에서 이미 끝난 상태로 호출된다.
     */
    @Transactional
    public AttendanceCorrectionRequest reject(Long id, Long rejecterUserId, String reason) {
        AttendanceCorrectionRequest req = correctionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없어요."));
        if (req.getAttendance() == null || req.getAttendance().getStore() == null) {
            throw new IllegalArgumentException("정정 대상 매장을 확인할 수 없어요.");
        }
        req.reject(reason);

        if (req.getRequester() != null) {
            notificationService.push(req.getRequester().getId(),
                    PushNotifier.PushMessage.builder()
                            .title("정정 요청이 거절됐어요")
                            .body(reason != null && !reason.isBlank()
                                    ? "사유: " + reason
                                    : "사장님이 정정 요청을 거절했어요. 사장님께 직접 확인해 보세요.")
                            .deepLink("sodam://attendance")
                            .data(Map.of("type", "ATTENDANCE_CORRECTION_REJECTED"))
                            .build());
        }
        supervision.notifyIfManager(rejecterUserId, req.getAttendance().getStore().getId(), "출퇴근 정정 거절");
        return req;
    }

    /** 컨트롤러가 attendance/store 접근에 필요한 매장 id 를 가드 이전에 조회할 수 있도록 제공. */
    @Transactional(readOnly = true)
    public Long resolveStoreIdForCorrectionRequest(Long id) {
        AttendanceCorrectionRequest req = correctionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없어요."));
        if (req.getAttendance() == null || req.getAttendance().getStore() == null) {
            throw new IllegalArgumentException("정정 대상 매장을 확인할 수 없어요.");
        }
        return req.getAttendance().getStore().getId();
    }
}
