package com.rich.sodam.service.retention;

import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.service.ElectronicSignatureEvidencePurgeService;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

abstract class AbstractElectronicSignatureRetentionPolicy implements RetentionPolicy {
    private final ElectronicSignatureEnvelopeRepository repository;
    private final ElectronicSignatureEvidencePurgeService purgeService;
    private final SignatureSubjectType subjectType;
    private final Period period;

    AbstractElectronicSignatureRetentionPolicy(ElectronicSignatureEnvelopeRepository repository,
                                                ElectronicSignatureEvidencePurgeService purgeService,
                                                SignatureSubjectType subjectType, Period period) {
        this.repository = repository;
        this.purgeService = purgeService;
        this.subjectType = subjectType;
        this.period = period;
    }

    @Override public String tableName() { return "electronic_signature_" + subjectType.name().toLowerCase(); }
    @Override public Period retentionPeriod() { return period; }
    @Override public boolean noticeRequired() { return true; }
    @Override public List<ExpiredEntity> findExpired(LocalDateTime cutoff) {
        return repository.findBySubjectTypeAndStatusAndCompletedAtLessThanEqual(
                        subjectType, SignatureEnvelopeStatus.VERIFIED, cutoff).stream()
                .map(envelope -> new ExpiredEntity(envelope.getId(), envelope.getCompletedAt())).toList();
    }
    @Override public void purge(Long entityId) { purgeService.purge(entityId, subjectType); }
}

@Component
class ManagerDelegationSignatureRetentionPolicy extends AbstractElectronicSignatureRetentionPolicy {
    ManagerDelegationSignatureRetentionPolicy(ElectronicSignatureEnvelopeRepository repository,
                                               ElectronicSignatureEvidencePurgeService purgeService) {
        super(repository, purgeService, SignatureSubjectType.MANAGER_DELEGATION, Period.ofYears(5));
    }
}

@Component
class LaborContractSignatureRetentionPolicy extends AbstractElectronicSignatureRetentionPolicy {
    LaborContractSignatureRetentionPolicy(ElectronicSignatureEnvelopeRepository repository,
                                           ElectronicSignatureEvidencePurgeService purgeService) {
        super(repository, purgeService, SignatureSubjectType.LABOR_CONTRACT, Period.ofYears(3));
    }
}

@Component
class EmploymentAmendmentSignatureRetentionPolicy extends AbstractElectronicSignatureRetentionPolicy {
    EmploymentAmendmentSignatureRetentionPolicy(ElectronicSignatureEnvelopeRepository repository,
                                                 ElectronicSignatureEvidencePurgeService purgeService) {
        super(repository, purgeService, SignatureSubjectType.LABOR_CONTRACT_AMENDMENT, Period.ofYears(3));
    }
}
