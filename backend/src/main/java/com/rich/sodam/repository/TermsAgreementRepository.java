package com.rich.sodam.repository;

import com.rich.sodam.domain.TermsAgreement;
import com.rich.sodam.domain.type.TermsType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TermsAgreementRepository extends JpaRepository<TermsAgreement, Long> {

    List<TermsAgreement> findByUserIdOrderByRecordedAtDesc(Long userId);

    List<TermsAgreement> findByUserIdAndTermsTypeOrderByRecordedAtDesc(Long userId, TermsType termsType);
}
