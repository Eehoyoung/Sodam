package com.rich.sodam.repository;

import com.rich.sodam.domain.MasterProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MasterProfileRepository extends JpaRepository<MasterProfile, Long> {
}