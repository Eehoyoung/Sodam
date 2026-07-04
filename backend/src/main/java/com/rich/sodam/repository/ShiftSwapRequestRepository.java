package com.rich.sodam.repository;

import com.rich.sodam.domain.ShiftSwapRequest;
import com.rich.sodam.domain.type.SwapRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 대타 모집 요청 레포지토리.
 */
public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, Long> {

    /** 같은 시프트에 이미 진행 중(OPEN)인 모집이 있는지 — 생성 시 409 가드. */
    boolean existsByShiftIdAndStatus(Long shiftId, SwapRequestStatus status);

    /** 매장의 모집 목록(최신순). */
    List<ShiftSwapRequest> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    /** 매장의 특정 상태 모집 목록(최신순). */
    List<ShiftSwapRequest> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, SwapRequestStatus status);
}
