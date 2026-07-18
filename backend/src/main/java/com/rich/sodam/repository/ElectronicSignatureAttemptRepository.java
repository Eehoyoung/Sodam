package com.rich.sodam.repository;

import com.rich.sodam.domain.ElectronicSignatureAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ElectronicSignatureAttemptRepository extends JpaRepository<ElectronicSignatureAttempt, Long> {
    boolean existsByIdempotencyKey(String idempotencyKey);
    Optional<ElectronicSignatureAttempt> findByIdempotencyKey(String idempotencyKey);
}
