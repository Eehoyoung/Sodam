package com.rich.sodam.repository;

import com.rich.sodam.domain.StoreNfcTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 매장-NFC 태그 매핑 조회. 출근 검증(active 매핑 존재 확인)과 사장 관리(목록/조회)에 사용.
 */
@Repository
public interface StoreNfcTagRepository extends JpaRepository<StoreNfcTag, Long> {

    /** 출근 검증의 핵심: 해당 매장에 이 태그가 active 로 등록돼 있는가. */
    boolean existsByStore_IdAndTagIdAndActiveTrue(Long storeId, String tagId);

    /** 태그 식별자로 단건 조회(전역 유니크). 등록 중복 방지·활성화 토글에 사용. */
    Optional<StoreNfcTag> findByTagId(String tagId);

    /** 매장의 태그 목록(활성/비활성 모두). 사장 관리 화면용. */
    List<StoreNfcTag> findByStore_IdOrderByCreatedAtDesc(Long storeId);

    boolean existsByTagId(String tagId);
}
