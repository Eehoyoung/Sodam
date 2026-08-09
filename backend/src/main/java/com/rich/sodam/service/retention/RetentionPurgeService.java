package com.rich.sodam.service.retention;

import com.rich.sodam.domain.RetentionPurgeSchedule;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 보존기간 만료 로우를 찾아 파기 대기로 등록하고, 유예기간이 지나면 실제 파기하는 배치
 * (DB_OPTIMIZATION_PLAN.md §2.2(c), §2.5, Phase 6).
 *
 * <p>등록된 {@link RetentionPolicy} 빈들을 순회하는 구조라, 새 테이블의 보존정책을 추가하려면
 * {@link RetentionPolicy} 구현체 하나만 추가하면 된다. 연결된 정책: domain_event, reminder_log,
 * notification_inbox(카테고리 3종), electronic_signature(주체 3종), 그리고
 * attendance·labor_contract({@code LaborRecordRetentionPolicies}, WP-J에서 추가).</p>
 *
 * <p>⚠️ <b>사전 고지는 아직 미구현이다.</b> {@link RetentionPolicy#noticeRequired()}는 정책이 스스로를
 * "고지 대상"으로 표시하는 플래그이고 {@code retention_purge_schedule}에 발송 시각 컬럼
 * (notice_30d/15d/1d_sent_at)도 준비돼 있으나, <b>이 값을 읽어 실제로 메일을 보내는 코드가 없다</b>.
 * 근로관계 기록처럼 {@code noticeRequired=true}인 정책의 파기를 실제로 켜기 전에 반드시 고지 발송과
 * 데이터 다운로드 제공을 먼저 구현해야 한다(2026-08-07 법무·노무 공통 권고 — 임금채권 시효가
 * 보존기간과 같은 3년이라 시효 직전에 증거가 먼저 사라질 수 있다).</p>
 *
 * <p><b>scan/schedule은 되돌릴 수 있는 작업</b>(스케줄 등록만, 원본 데이터 불변)이라 자동 배치로 안전하게
 * 돌려도 된다. <b>실제 파기(purge)는 되돌릴 수 없다</b> — {@link RetentionNoticeScheduler}가 별도
 * 활성화 플래그 없이는 {@link #executePurge()}를 호출하지 않도록 게이팅한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RetentionPurgeService {

    /** 만료 후 실제 파기까지의 유예기간(§2.2(c) 확정 정책). */
    static final int GRACE_PERIOD_DAYS = 30;

    private final List<RetentionPolicy> policies;
    private final RetentionPurgeScheduleRepository scheduleRepository;

    private static LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private Map<String, RetentionPolicy> policiesByTableName() {
        return policies.stream().collect(Collectors.toMap(RetentionPolicy::tableName, Function.identity()));
    }

    /**
     * 모든 정책을 스캔해 새로 만료된 대상을 {@code retention_purge_schedule}에 등록한다. 멱등 —
     * 이미 등록된 (table_name, entity_id) 조합은 건너뛴다. 원본 데이터를 전혀 건드리지 않으므로
     * 되돌릴 수 있는 작업이라 상시 배치로 안전하게 돌 수 있다.
     *
     * @return 새로 등록된 건수
     */
    @Transactional
    public int scanAndSchedule() {
        LocalDateTime now = LocalDateTime.now();
        int scheduled = 0;
        for (RetentionPolicy policy : policies) {
            LocalDateTime cutoff = now.minus(policy.retentionPeriod());
            List<RetentionPolicy.ExpiredEntity> expired = policy.findExpired(cutoff);
            for (RetentionPolicy.ExpiredEntity e : expired) {
                if (scheduleRepository.findByTableNameAndEntityId(policy.tableName(), e.id()).isPresent()) {
                    continue;
                }
                LocalDateTime expiresAt = e.anchoredAt().plus(policy.retentionPeriod());
                // 유예는 "만료일로부터" 30일이되, 이미 만료된 지 오래인 건(정책 신설 직후의 적체분)은
                // "발견 시점으로부터" 30일을 준다. 그러지 않으면 스케줄에 오르자마자 파기 대상이 되어
                // 30/15/1일 사전 고지를 보낼 시간 자체가 없다 — 고지가 형식이 되지 않도록 하는 장치다.
                LocalDateTime purgeAt = max(expiresAt.plusDays(GRACE_PERIOD_DAYS), now.plusDays(GRACE_PERIOD_DAYS));
                scheduleRepository.save(new RetentionPurgeSchedule(policy.tableName(), e.id(), expiresAt, purgeAt));
                scheduled++;
            }
        }
        if (scheduled > 0) {
            log.info("[RetentionPurge] 신규 파기 대상 {}건 스케줄 등록", scheduled);
        }
        return scheduled;
    }

    /**
     * 파기 예정일이 도래한(그리고 법적 홀드가 아닌) 대상을 실제로 파기한다 — 되돌릴 수 없다.
     * 정책이 사라진(배포에서 제거된) table_name은 안전하게 건너뛴다.
     *
     * @return 실제로 파기된 건수
     */
    @Transactional
    public int executePurge() {
        Map<String, RetentionPolicy> byTable = policiesByTableName();
        List<RetentionPurgeSchedule> due = scheduleRepository.findDueForPurge(LocalDateTime.now());
        int purged = 0;
        for (RetentionPurgeSchedule schedule : due) {
            RetentionPolicy policy = byTable.get(schedule.getTableName());
            if (policy == null) {
                log.warn("[RetentionPurge] table_name={} 에 대한 정책이 없어 스킵(id={})",
                        schedule.getTableName(), schedule.getId());
                continue;
            }
            // 고지 대상인데 사전 고지가 완결되지 않았으면 파기하지 않는다 — 메일 발송 실패·수신처 부재 등으로
            // 근로자가 통지를 못 받은 채 증거가 사라지는 것을 막는 최후 방어선이다(법무·노무 공통 권고).
            // 파기 예정일이 지나도 고지가 완료될 때까지 대기하며, 다음 배치가 다시 시도한다.
            if (policy.noticeRequired() && !schedule.isNoticeCompleted()) {
                log.warn("[RetentionPurge] 사전 고지 미완료로 파기 보류 — table={} entityId={}",
                        schedule.getTableName(), schedule.getEntityId());
                continue;
            }
            policy.purge(schedule.getEntityId());
            schedule.markPurged();
            purged++;
        }
        if (purged > 0) {
            log.info("[RetentionPurge] {}건 실제 파기 완료", purged);
        }
        return purged;
    }
}
