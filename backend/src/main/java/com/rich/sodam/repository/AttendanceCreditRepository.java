package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceCredit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 출근권 지갑 레포지토리(recruitment-monetization-gamification-plan.md §2).
 *
 * <p>동시 소모 요청 방지는 {@link AttendanceCredit}의 {@code @Version} 낙관적 락으로만 처리한다
 * (요구사항: "낙관적 락 필수 — 동시 소모 요청 방지"). 비관적 잠금을 함께 걸면 경합이 항상 대기로
 * 흡수되어 낙관적 락 충돌(409)이 관측되지 않으므로 의도적으로 걸지 않는다.</p>
 */
public interface AttendanceCreditRepository extends JpaRepository<AttendanceCredit, Long> {

    Optional<AttendanceCredit> findByOwnerUserId(Long ownerUserId);
}
