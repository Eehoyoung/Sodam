package com.rich.sodam.repository;

import com.rich.sodam.domain.JobPosting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 구인 공고(JobPosting) 레포지토리(260711_작업통합.md Part 2 §19).
 */
public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    /** 매장의 공고 조회 — 매장당 1건(store_id UNIQUE, V55). upsert 판정·{@code GET .../job-posting}에 사용. */
    Optional<JobPosting> findByStore_Id(Long storeId);

    /** 구인중(open=true)인 공고 전체 — nearby 조회의 반경 필터링 전 후보군. */
    List<JobPosting> findByOpenTrue();
}
