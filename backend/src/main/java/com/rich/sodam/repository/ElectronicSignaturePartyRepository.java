package com.rich.sodam.repository;

import com.rich.sodam.domain.ElectronicSignatureParty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ElectronicSignaturePartyRepository extends JpaRepository<ElectronicSignatureParty, Long> {
    List<ElectronicSignatureParty> findByEnvelope_IdOrderBySigningOrderAsc(Long envelopeId);
    Optional<ElectronicSignatureParty> findByEnvelope_IdAndSigningOrder(Long envelopeId, int signingOrder);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ElectronicSignatureParty p where p.id = :id")
    Optional<ElectronicSignatureParty> findByIdForUpdate(@Param("id") Long id);
}
