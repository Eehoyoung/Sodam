package com.rich.sodam.service.retention;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * 테이블 하나의 보존기간 정책(DB_OPTIMIZATION_PLAN.md §2.2(a), §2.5).
 *
 * <p>{@link RetentionPurgeService}가 등록된 모든 정책(Spring 빈)을 순회하며 만료 대상을 찾아
 * {@code retention_purge_schedule}에 기록한다. 새 테이블의 보존정책을 추가하려면 이 인터페이스를
 * 구현하는 빈 하나만 추가하면 된다 — 스캔·스케줄링·유예·고지 프레임워크는 공통.</p>
 */
public interface RetentionPolicy {

    /**
     * {@code retention_purge_schedule.table_name}에 기록되는 정책 식별 키.
     *
     * <p>모든 정책 인스턴스에서 유일해야 한다({@link RetentionPurgeService}가 이 값으로
     * 스케줄 멱등성 판정 + 파기 시점 정책 조회를 함께 한다) — 하지만 반드시 실제 SQL 테이블명과
     * 1:1일 필요는 없다. 예를 들어 {@code notification_inbox}는 카테고리별로 보존기간이 다르므로
     * (§2.5) 같은 물리 테이블을 대상으로 하는 정책이 여러 개 있을 수 있다(예:
     * {@code "notification_inbox_hr_notice"}, {@code "notification_inbox_billing"}) — 이 경우
     * 각 정책은 자신이 담당하는 카테고리만 {@link #findExpired}에서 걸러내야 한다.
     */
    String tableName();

    /** 법정/정책 보존기간(예: 3년, 5년, 2년, 1년). */
    Period retentionPeriod();

    /**
     * 이 정책이 요구하는 이메일 사전 고지(30/15/1일 전, §2.2(c))가 필요한지 —
     * 근로관계 기록처럼 "데이터 주체"가 명확한 테이블만 true. 시스템/로그성 테이블은 false로 두면
     * {@link RetentionPurgeService}가 고지 없이 유예기간만 두고 파기한다.
     */
    default boolean noticeRequired() {
        return false;
    }

    /**
     * 기산 시각이 {@code cutoff}(=now - retentionPeriod) 이전이라 이미 만료된 대상을 찾는다.
     * 아직 파기 스케줄에 없는 것만 걸러내는 멱등 처리는 {@link RetentionPurgeService}가 담당한다.
     */
    List<ExpiredEntity> findExpired(LocalDateTime cutoff);

    /** 실제 파기 실행(삭제 또는 PII 마스킹) — 되돌릴 수 없으므로 호출 전 반드시 유예·고지 확인 완료 상태여야 한다. */
    void purge(Long entityId);

    /** 만료 대상 1건 — 실제 보존 시계가 시작된 시각을 함께 반환해야 정확한 만료일을 계산할 수 있다. */
    record ExpiredEntity(Long id, LocalDateTime anchoredAt) {
    }
}
