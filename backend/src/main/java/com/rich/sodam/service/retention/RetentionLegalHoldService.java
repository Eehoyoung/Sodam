package com.rich.sodam.service.retention;

import com.rich.sodam.domain.RetentionPurgeSchedule;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RetentionLegalHoldService {
    private final RetentionPurgeScheduleRepository repository;

    @Transactional
    public void place(String policyKey, Long entityId, String reason) {
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("법적 보류 사유가 필요합니다.");
        schedule(policyKey, entityId).placeLegalHold(reason.trim());
    }

    @Transactional
    public void release(String policyKey, Long entityId) {
        schedule(policyKey, entityId).releaseLegalHold();
    }

    private RetentionPurgeSchedule schedule(String policyKey, Long entityId) {
        return repository.findByTableNameAndEntityId(policyKey, entityId)
                .orElseThrow(() -> new EntityNotFoundException("파기 스케줄을 찾을 수 없습니다."));
    }
}
