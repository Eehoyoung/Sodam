package com.rich.sodam.repository;

import com.rich.sodam.domain.StorePhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorePhotoRepository extends JpaRepository<StorePhoto, Long> {
    List<StorePhoto> findByStore_IdOrderByDisplayOrderAsc(Long storeId);
    long countByStore_Id(Long storeId);
}
