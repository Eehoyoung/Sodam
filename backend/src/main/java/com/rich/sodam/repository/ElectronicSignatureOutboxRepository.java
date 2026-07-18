package com.rich.sodam.repository;

import com.rich.sodam.domain.ElectronicSignatureOutbox;
import com.rich.sodam.domain.type.SignatureOutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ElectronicSignatureOutboxRepository extends JpaRepository<ElectronicSignatureOutbox, Long> {
    boolean existsByIdempotencyKey(String idempotencyKey);
    List<ElectronicSignatureOutbox> findByEnvelopeId(Long envelopeId);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ElectronicSignatureOutbox o where o.id = :id")
    Optional<ElectronicSignatureOutbox> findByIdForUpdate(@Param("id") Long id);

    @Query("select o.id from ElectronicSignatureOutbox o " +
            "where ((o.status in :ready and o.nextAttemptAt <= :now) " +
            "or (o.status = :leased and o.leaseUntil < :now)) order by o.nextAttemptAt, o.id")
    List<Long> findDueIds(@Param("ready") Collection<SignatureOutboxStatus> ready,
                          @Param("leased") SignatureOutboxStatus leased,
                          @Param("now") LocalDateTime now,
                          Pageable pageable);
}
