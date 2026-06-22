package com.rich.sodam.repository;

import com.rich.sodam.domain.StoreNotice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreNoticeRepository extends JpaRepository<StoreNotice, Long> {

    /** 매장 공지 목록(최신순) — 사장 화면용. */
    List<StoreNotice> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    /** 여러 매장의 공지 목록(최신순) — 직원이 소속된 매장 전체용. */
    List<StoreNotice> findByStoreIdInOrderByCreatedAtDesc(List<Long> storeIds);
}
