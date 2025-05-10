package com.rich.sodam.repository;

import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MasterStoreRelationRepository extends JpaRepository<MasterStoreRelation, Long> {
    List<MasterStoreRelation> findByMasterProfile(MasterProfile masterProfile);
    List<MasterStoreRelation> findByStore(Store store);
}