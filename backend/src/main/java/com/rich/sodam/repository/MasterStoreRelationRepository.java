package com.rich.sodam.repository;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MasterStoreRelationRepository extends JpaRepository<MasterStoreRelation, Long> {
    List<MasterStoreRelation> findByMasterProfile(MasterProfile masterProfile);

    List<MasterStoreRelation> findByStore(Store store);

    List<MasterStoreRelation> findByStore_Id(Long storeId);

    java.util.Optional<MasterStoreRelation> findFirstByStore_IdOrderByIdAsc(Long storeId);

    /**
     * 사장이 해당 매장을 소유하는지 검증 (StoreAccessGuard 용).
     */
    boolean existsByMasterProfile_IdAndStore_Id(Long masterId, Long storeId);
}
