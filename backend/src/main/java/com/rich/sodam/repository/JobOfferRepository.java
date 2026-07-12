package com.rich.sodam.repository;

import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.type.JobResponseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 채용 제안(JobOffer) 레포지토리(260711_작업통합.md Part 2 §15).
 *
 * <p>중복 PENDING 최종 방어는 V54의 {@code pending_dedup_key} 유니크 인덱스가 담당하므로,
 * 이 레포지토리의 조회 메서드는 사용자 친화적 409를 위한 사전 체크 용도다(이중 방어의 앞단).</p>
 */
public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {

    /** 받은 제안 목록(최신순) — {@code GET /api/job-offers/me}. */
    List<JobOffer> findByTargetUser_IdOrderByCreatedAtDesc(Long targetUserId);

    /** 매장이 보낸 제안 목록(최신순). */
    List<JobOffer> findByStore_IdOrderByCreatedAtDesc(Long storeId);

    /** 같은 매장→같은 구직자 대기중 제안 존재 여부(사전 체크, 409 판정용). */
    Optional<JobOffer> findByStore_IdAndTargetUser_IdAndStatus(Long storeId, Long targetUserId, JobResponseStatus status);
}
