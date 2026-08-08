package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 개인 모드 상태·전환 자격 판정 (PRD §2.1, §4.14 / WP-K).
 *
 * <p>개인 모드는 역할이 아니라 상태다. 이 서비스는 <b>등급을 바꾸지 않고</b> 상태만 다룬다.</p>
 *
 * <h3>전환을 권유하는 시점</h3>
 * <p>활성 매장 소속이 0건이 되었다고 바로 권유하지 않는다. 퇴사는 민감한 순간이고, 사장이
 * 오조작으로 비활성화했거나 곧바로 재고용하는 경우도 있다. 게다가 부당해고 다툼(노동위 구제신청
 * 기간 3개월) 중일 수 있어, 앱이 서둘러 "다음 단계"를 제시하면 근로자에게 불리한 신호가 된다.
 * 그래서 <b>0건 상태가 7일 이상 지속</b>된 뒤에야 권유 대상으로 본다(2026-08-07 노무 검토 반영).</p>
 */
@Service
@RequiredArgsConstructor
public class PersonalModeService {

    /** 활성 소속 0건이 이만큼 지속돼야 전환을 권유한다. */
    static final int SUGGEST_AFTER_DAYS = 7;

    private final UserRepository userRepository;
    private final EmployeeStoreRelationRepository relationRepository;

    /**
     * 개인 모드 관련 현재 상태.
     *
     * @param personalModeEnabled 개인 모드가 켜져 있는지
     * @param activeStoreCount    현재 활성 매장 소속 수 — 랜딩 판정의 1차 기준
     * @param suggestConversion   전환 권유 화면을 띄워야 하는지(꺼져 있고, 0건이 7일 이상 지속)
     */
    public record Status(boolean personalModeEnabled, int activeStoreCount, boolean suggestConversion) {
    }

    @Transactional(readOnly = true)
    public Status status(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
        return statusOf(user);
    }

    /** 이미 조회한 User 로 상태를 만든다 — {@code /me} 처럼 User 를 이미 들고 있는 경로용(중복 조회 방지). */
    @Transactional(readOnly = true)
    public Status statusOf(User user) {
        int activeCount = relationRepository.findActiveByEmployeeIdWithStore(user.getId()).size();
        boolean suggest = !user.isPersonalModeEnabled()
                && activeCount == 0
                && lastTerminationOlderThanThreshold(user.getId());
        return new Status(user.isPersonalModeEnabled(), activeCount, suggest);
    }

    /**
     * 마지막 퇴사로부터 {@link #SUGGEST_AFTER_DAYS} 이상 지났는지.
     *
     * <p>소속 이력이 아예 없는 사용자(가입만 하고 매장에 들어간 적 없음)는 <b>권유 대상이 아니다</b> —
     * 전환 화면은 "퇴사하셨네요"라는 맥락의 안내라, 근무한 적 없는 사람에게는 뜻이 통하지 않는다.
     * 이런 사용자는 가입 시 목적 선택(personal)으로 개인 모드에 들어오는 경로를 쓴다.</p>
     */
    private boolean lastTerminationOlderThanThreshold(Long userId) {
        List<EmployeeStoreRelation> all = relationRepository.findByEmployeeProfile_Id(userId);
        LocalDateTime latest = null;
        for (EmployeeStoreRelation r : all) {
            LocalDateTime at = r.getDeactivatedAt();
            if (at != null && (latest == null || at.isAfter(latest))) {
                latest = at;
            }
        }
        if (latest == null) {
            return false;
        }
        return Duration.between(latest, LocalDateTime.now()).toDays() >= SUGGEST_AFTER_DAYS;
    }
}
