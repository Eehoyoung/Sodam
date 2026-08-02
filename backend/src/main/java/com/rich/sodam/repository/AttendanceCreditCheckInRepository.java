package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceCreditCheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 사장 일일 출석체크 로그 레포지토리(recruitment-monetization-gamification-plan.md §5).
 */
public interface AttendanceCreditCheckInRepository extends JpaRepository<AttendanceCreditCheckIn, Long> {

    Optional<AttendanceCreditCheckIn> findByOwnerUserIdAndCheckInDate(Long ownerUserId, LocalDate checkInDate);

    /** 이번 주(월~일) 출석 그리드 조회용. */
    List<AttendanceCreditCheckIn> findByOwnerUserIdAndCheckInDateBetween(Long ownerUserId, LocalDate start, LocalDate end);
}
