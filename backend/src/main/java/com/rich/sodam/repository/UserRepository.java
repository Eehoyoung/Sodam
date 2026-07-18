package com.rich.sodam.repository;

import com.rich.sodam.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    /**
     * Apple sub 클레임으로 사용자 조회 — Sign in with Apple 재로그인 시 기본 조회 키.
     */
    Optional<User> findByAppleSub(String appleSub);

    /**
     * 최근 생성된 사용자 20명 조회 (캐시 워밍업용)
     */
    List<User> findTop20ByOrderByCreatedAtDesc();

    /**
     * 탈퇴 후 보관기간이 경과했고 아직 PII 익명화되지 않은 사용자.
     * PIPA §21 파기 배치(UserDataRetentionScheduler) 대상.
     *
     * @param threshold 익명화 기준 시각 (now - 보관일수). 이보다 이전 탈퇴분이 대상.
     */
    @Query("select u from User u " +
            "where u.withdrawnAt is not null " +
            "  and u.withdrawnAt <= :threshold " +
            "  and u.piiAnonymizedAt is null")
    List<User> findWithdrawnDueForAnonymization(@Param("threshold") LocalDateTime threshold);
}
