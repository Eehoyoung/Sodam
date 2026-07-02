package com.rich.sodam.personal.repository;

import com.rich.sodam.personal.domain.PersonalAttendance;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface PersonalAttendanceRepository extends JpaRepository<PersonalAttendance, Long> {

    List<PersonalAttendance> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    List<PersonalAttendance> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long id, Pageable pageable);

    List<PersonalAttendance> findByUserIdAndCheckInAtBetweenOrderByIdDesc(Long userId, OffsetDateTime from, OffsetDateTime to, Pageable pageable);

    List<PersonalAttendance> findByUserIdAndCheckInAtBetweenAndIdLessThanOrderByIdDesc(Long userId, OffsetDateTime from, OffsetDateTime to, Long id, Pageable pageable);

    Optional<PersonalAttendance> findFirstByUserIdAndCheckOutAtIsNullOrderByIdDesc(Long userId);

    Optional<PersonalAttendance> findByIdAndUserId(Long id, Long userId);

    /** 연간 세무 집계용 — 기간 내 전체(비페이지). */
    List<PersonalAttendance> findByUserIdAndCheckInAtBetween(Long userId, OffsetDateTime from, OffsetDateTime to);
}
