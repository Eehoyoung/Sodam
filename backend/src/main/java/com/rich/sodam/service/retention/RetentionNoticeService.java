package com.rich.sodam.service.retention;

import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.RetentionPurgeSchedule;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 보존기간 만료 전 사전 고지(30/15/1일) 발송 — 260807 마스터 실행계획서 WP-J.
 *
 * <p>이 서비스가 없으면 {@link RetentionPolicy#noticeRequired()}가 true인 정책(근로관계 기록·전자서명)의
 * 파기를 켤 수 없다. 임금채권·퇴직급여 청구권 소멸시효가 보존기간과 똑같이 <b>3년</b>이라, 고지 없이
 * 파기하면 근로자가 시효 만료 직전에 증거를 잃는다(2026-08-07 법무·노무 공통 권고).</p>
 *
 * <h3>사람 단위로 묶어 보낸다</h3>
 * <p>출퇴근 기록은 한 사람이 수백 건이다. 로우 1건당 메일 1통을 보내면 그 자체가 사고다.
 * 따라서 <b>(사용자 × 고지단계)</b> 하나당 메일 1통으로 묶고, 본문에는 데이터 종류별 건수와
 * 가장 이른 파기 예정일을 담는다.</p>
 *
 * <h3>발송 실패 시</h3>
 * <p>발송에 실패하면 {@code notice_*_sent_at}을 기록하지 않는다 — 다음 날 배치가 다시 시도한다.
 * 고지를 보내지 못한 건은 파기되면 안 되므로, 실제 파기 게이트를 켜기 전에 미발송 잔량을 확인할 것.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RetentionNoticeService {

    /** 가장 이른 고지 시점 — 파기 예정일 30일 전. */
    static final int NOTICE_HORIZON_DAYS = 30;

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy년 M월 d일");

    private final List<RetentionPolicy> policies;
    private final RetentionPurgeScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;

    /** (사용자, 단계) 묶음 하나 — 메일 1통에 대응. */
    private record NoticeKey(Long userId, int milestoneDays) {
    }

    /**
     * 고지가 필요한 대상을 찾아 사용자별로 묶어 발송한다.
     *
     * @return 발송한 메일 통수(로우 건수가 아니다)
     */
    @Transactional
    public int sendDueNotices() {
        LocalDateTime now = LocalDateTime.now();
        Map<String, RetentionPolicy> byTable = policies.stream()
                .collect(Collectors.toMap(RetentionPolicy::tableName, Function.identity()));

        Map<NoticeKey, List<RetentionPurgeSchedule>> grouped = new LinkedHashMap<>();

        for (RetentionPurgeSchedule schedule : scheduleRepository.findNeedingNotice(now.plusDays(NOTICE_HORIZON_DAYS))) {
            RetentionPolicy policy = byTable.get(schedule.getTableName());
            if (policy == null || !policy.noticeRequired()) {
                continue;
            }
            OptionalInt milestone = schedule.pendingNoticeMilestone(now);
            if (milestone.isEmpty()) {
                continue;
            }
            Optional<Long> subject = policy.dataSubjectUserId(schedule.getEntityId());
            if (subject.isEmpty()) {
                // 원본이 이미 사라진 경우 등 — 고지 대상을 특정할 수 없으면 유예기간만 적용한다.
                continue;
            }
            grouped.computeIfAbsent(new NoticeKey(subject.get(), milestone.getAsInt()), k -> new ArrayList<>())
                    .add(schedule);
        }

        int sent = 0;
        for (Map.Entry<NoticeKey, List<RetentionPurgeSchedule>> entry : grouped.entrySet()) {
            if (sendOne(entry.getKey(), entry.getValue(), byTable, now)) {
                sent++;
            }
        }
        if (sent > 0) {
            log.info("[RetentionNotice] 사전 고지 {}통 발송(대상 로우 {}건)",
                    sent, grouped.values().stream().mapToInt(List::size).sum());
        }
        return sent;
    }

    private boolean sendOne(NoticeKey key, List<RetentionPurgeSchedule> schedules,
                            Map<String, RetentionPolicy> byTable, LocalDateTime now) {
        Optional<User> user = userRepository.findById(key.userId());
        if (user.isEmpty() || user.get().getEmail() == null || user.get().getEmail().isBlank()) {
            log.warn("[RetentionNotice] userId={} 수신 이메일이 없어 고지 스킵({}건)", key.userId(), schedules.size());
            return false;
        }

        LocalDateTime earliestPurge = schedules.stream()
                .map(RetentionPurgeSchedule::getScheduledPurgeAt)
                .min(LocalDateTime::compareTo)
                .orElse(now);

        Map<String, Long> countsByType = schedules.stream().collect(Collectors.groupingBy(
                s -> byTable.get(s.getTableName()).displayName(), LinkedHashMap::new, Collectors.counting()));

        String subject = "[소담] %d일 후 근무 기록이 파기됩니다 — 필요하시면 먼저 내려받아 주세요"
                .formatted(key.milestoneDays());
        String body = buildBody(user.get().getName(), key.milestoneDays(), earliestPurge, countsByType);

        EmailSender.SendResult result = emailSender.sendWithAttachments(
                user.get().getEmail(), subject, body, List.of());
        if (!result.isSuccess()) {
            // sent_at 을 기록하지 않으므로 다음 배치가 재시도한다.
            log.error("[RetentionNotice] 고지 발송 실패 userId={} milestone={}일 rows={}",
                    key.userId(), key.milestoneDays(), schedules.size());
            return false;
        }

        schedules.forEach(s -> s.markNoticeSent(key.milestoneDays(), now));
        scheduleRepository.saveAll(schedules);
        return true;
    }

    private String buildBody(String name, int milestoneDays, LocalDateTime purgeAt, Map<String, Long> counts) {
        StringBuilder sb = new StringBuilder();
        sb.append(name == null ? "회원" : name).append("님, 안녕하세요.\n\n")
                .append("보관 기간이 끝나 아래 기록이 ").append(purgeAt.format(DATE))
                .append("에 파기될 예정입니다(약 ").append(milestoneDays).append("일 후).\n\n");
        counts.forEach((type, count) -> sb.append("· ").append(type).append(" ").append(count).append("건\n"));
        sb.append("\n소담은 근로기준법 제42조에 따라 근로관계 기록을 3년간 보관한 뒤 파기합니다.\n")
                .append("파기된 기록은 되돌릴 수 없으니, 필요하시면 파기 전에 앱에서 내려받아 보관해 주세요.\n")
                .append("소담 앱 > 마이페이지 > 내 근무 기록에서 내려받을 수 있습니다.\n\n")
                .append("문의: 소담 고객센터\n");
        return sb.toString();
    }
}
