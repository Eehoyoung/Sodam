package com.rich.sodam.repository;

import com.rich.sodam.domain.JobSeekingProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 인증채용 구직 프로필 레포지토리(260711_작업통합.md Part 2 §6.1).
 */
public interface JobSeekingProfileRepository extends JpaRepository<JobSeekingProfile, Long> {

    /** 사용자 ID로 구직 프로필 조회 — {@code GET/PUT /api/job-seekers/me}의 principal 기준 조회. */
    Optional<JobSeekingProfile> findByUser_Id(Long userId);

    /**
     * 구직중(seeking=true)인 프로필 전체를 {@code user}까지 fetch join 하여 조회 — N+1 방지.
     * 매장 리스트(§4 매칭 로직) 조회 시 반경 필터링 전 후보군으로 사용한다.
     */
    @Query("SELECT p FROM JobSeekingProfile p JOIN FETCH p.user WHERE p.seeking = true")
    List<JobSeekingProfile> findAllSeekingWithUser();
}
