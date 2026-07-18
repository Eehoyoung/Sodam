package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureAccessAudit;
import com.rich.sodam.repository.ElectronicSignatureAccessAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ElectronicSignatureAccessAuditService {
    private final ElectronicSignatureAccessAuditRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long envelopeId, Long userId, String artifact, String outcome) {
        repository.save(ElectronicSignatureAccessAudit.of(envelopeId, userId, artifact, outcome));
    }
}
