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

/**
 * 퇴사 확인서 보존정책(260817 퇴사 처리 기능 계획서 WP-4, HC-14).
 *
 * <p>보존연한 3년은 {@code LaborContract}류와 같은 값을 잠정 채택한 것이다 — G-6(근로기록
 * 보존기간 기산일)이 다루는 "기산일 로직"과는 결이 다른 문제(이건 "기존 정책 패턴을 새 문서
 * 유형에 반복 적용")지만, 정확한 보존연한 자체는 노무 자문이 필요할 수 있다. 노무사 회신 후
 * 이 값만 교체하면 된다.</p>
 */
@Component
class ResignationAcknowledgmentSignatureRetentionPolicy extends AbstractElectronicSignatureRetentionPolicy {
    ResignationAcknowledgmentSignatureRetentionPolicy(ElectronicSignatureEnvelopeRepository repository,
                                                        ElectronicSignatureEvidencePurgeService purgeService) {
        super(repository, purgeService, SignatureSubjectType.RESIGNATION_ACKNOWLEDGMENT, Period.ofYears(3));
    }
}
