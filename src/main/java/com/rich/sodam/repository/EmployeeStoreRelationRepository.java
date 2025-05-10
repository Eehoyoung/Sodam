package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeStoreRelationRepository extends JpaRepository<EmployeeStoreRelation, Long> {
    List<EmployeeStoreRelation> findByEmployeeProfile(EmployeeProfile employeeProfile);
    List<EmployeeStoreRelation> findByStore(Store store);
}