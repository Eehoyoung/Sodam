package com.rich.sodam.repository;

import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    /**
     * 사업자등록번호로 매장을 조회합니다.
     *
     * @param businessNumber 사업자등록번호
     * @return 매장 정보 (Optional)
     */
    Optional<Store> findByBusinessNumber(String businessNumber);
}
