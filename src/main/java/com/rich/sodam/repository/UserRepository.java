package com.rich.sodam.repository;

import com.rich.sodam.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    /**
     * 최근 생성된 사용자 20명 조회 (캐시 워밍업용)
     */
    List<User> findTop20ByOrderByCreatedAtDesc();
}
