package com.rich.sodam.repository;

import com.rich.sodam.domain.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByCodeHashAndUsedFalse(String codeHash);

    Optional<PasswordResetToken> findByResetTicketAndUsedFalse(String resetTicket);

    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.used = true WHERE t.email = :email AND t.used = false")
    int invalidateAllForEmail(@Param("email") String email);
}
