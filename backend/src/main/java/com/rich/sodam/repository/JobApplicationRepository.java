package com.rich.sodam.repository;

import com.rich.sodam.domain.JobApplication;
import com.rich.sodam.domain.type.JobResponseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 구인 공고 지원(JobApplication) 레포지토리(260711_작업통합.md Part 2 §19).
 *
 * <p>중복 PENDING 최종 방어는 V55의 {@code pending_dedup_key} 유니크 인덱스가 담당하므로,
 * 이 레포지토리의 조회 메서드는 사용자 친화적 409를 위한 사전 체크 용도다(이중 방어의 앞단).</p>
 */
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    /** 공고의 지원자 목록(최신순) — 사장 지원자 리스트. */
    List<JobApplication> findByPosting_IdOrderByCreatedAtDesc(Long postingId);

    /** 내 지원 현황(최신순) — {@code GET /api/job-applications/me}. */
    List<JobApplication> findByApplicantUser_IdOrderByCreatedAtDesc(Long applicantUserId);

    /** 같은 공고→같은 지원자 대기중 지원 존재 여부(사전 체크, 409 판정용). */
    Optional<JobApplication> findByPosting_IdAndApplicantUser_IdAndStatus(
            Long postingId, Long applicantUserId, JobResponseStatus status);
}
