package com.rich.sodam.repository;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;

public interface ElectronicSignatureEnvelopeRepository extends JpaRepository<ElectronicSignatureEnvelope, Long> {
    Optional<ElectronicSignatureEnvelope> findBySubjectTypeAndSubjectIdAndDocumentVersion(
            SignatureSubjectType type, Long subjectId, int documentVersion);
    Optional<ElectronicSignatureEnvelope> findFirstBySubjectTypeAndSubjectIdOrderByDocumentVersionDesc(
            SignatureSubjectType type, Long subjectId);
    List<ElectronicSignatureEnvelope> findBySubjectTypeAndStatusAndCompletedAtLessThanEqual(
            SignatureSubjectType type, SignatureEnvelopeStatus status, LocalDateTime completedAt);
    List<ElectronicSignatureEnvelope> findByAuthorityEnvelopeId(Long authorityEnvelopeId);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ElectronicSignatureEnvelope e where e.id = :id")
    Optional<ElectronicSignatureEnvelope> findByIdForUpdate(@Param("id") Long id);
}
