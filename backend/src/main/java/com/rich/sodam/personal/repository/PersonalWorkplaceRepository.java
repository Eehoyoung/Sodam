package com.rich.sodam.personal.repository;

import com.rich.sodam.personal.domain.PersonalWorkplace;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PersonalWorkplaceRepository extends JpaRepository<PersonalWorkplace, Long> {

    List<PersonalWorkplace> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    List<PersonalWorkplace> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long id, Pageable pageable);

    Optional<PersonalWorkplace> findByIdAndUserId(Long id, Long userId);

    long deleteByIdAndUserId(Long id, Long userId);
}
