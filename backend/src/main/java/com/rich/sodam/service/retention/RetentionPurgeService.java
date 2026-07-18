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
 * {@link RetentionPolicy} 구현체 하나만 추가하면 된다(현재는 domain_event·reminder_log 2개만
 * 연결돼 있다 — 나머지 §2.2(a) 근로관계 기록 테이블들은 이메일 고지 인프라가 아직 없어 후속 작업으로
 * 남겨뒀다. {@link RetentionPolicy#noticeRequired()} 참조).</p>
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
                LocalDateTime purgeAt = expiresAt.plusDays(GRACE_PERIOD_DAYS);
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
