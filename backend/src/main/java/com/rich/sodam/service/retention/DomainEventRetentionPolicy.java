package com.rich.sodam.service.retention;

import com.rich.sodam.domain.DomainEvent;
import com.rich.sodam.repository.DomainEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * domain_event 2년 보존(DB_OPTIMIZATION_PLAN.md §2.5) — 사용자가 "단기 국내 1위" 목표를 근거로
 * 법정 하한(1년, 5만 명 미만 시)보다 선제적으로 채택한 사업적 결정(2026-07-07 확정).
 * 접속·처리 이력 성격이라 데이터 주체 개인에게 사전 고지할 실익이 낮다고 판단해 고지는 생략한다
 * (noticeRequired=false) — 유예기간(30일)은 다른 정책과 동일하게 적용돼 즉시 삭제되지는 않는다.
 */
@Component
@RequiredArgsConstructor
public class DomainEventRetentionPolicy implements RetentionPolicy {

    private final DomainEventRepository domainEventRepository;

    @Override
    public String tableName() {
        return "domain_event";
    }

    @Override
    public Period retentionPeriod() {
        return Period.ofYears(2);
    }

    @Override
    public List<ExpiredEntity> findExpired(LocalDateTime cutoff) {
        return domainEventRepository.findByOccurredAtLessThan(cutoff).stream()
                .map(e -> new ExpiredEntity(e.getId(), e.getOccurredAt()))
                .toList();
    }

    @Override
    public void purge(Long entityId) {
        domainEventRepository.deleteById(entityId);
    }
}
