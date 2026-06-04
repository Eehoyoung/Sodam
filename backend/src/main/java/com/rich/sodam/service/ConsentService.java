package com.rich.sodam.service;

import com.rich.sodam.core.consent.TermsVersions;
import com.rich.sodam.domain.TermsAgreement;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TermsType;
import com.rich.sodam.dto.request.ConsentRequestDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.TermsAgreementRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 동의 수집·이력 관리 (PIPA §22 필수/선택 분리, 동의 입증·버전관리).
 *
 * <p>카카오 등 소셜 가입은 동의 없이 계정만 생성되므로(G-2), 후속 동의 화면에서 본 서비스로
 * 동의를 수집한다. 모든 동의는 {@link TermsAgreement} 불변 이력으로 버전과 함께 적재된다.</p>
 */
@Service
@RequiredArgsConstructor
public class ConsentService {

    private final UserRepository userRepository;
    private final TermsAgreementRepository termsAgreementRepository;

    /**
     * 사용자 동의를 기록한다. 필수 항목(이용약관·개인정보·만14세) 미동의 시 거부.
     * 위치정보·마케팅은 선택적으로 함께 기록 가능하다.
     */
    @Transactional
    public void recordConsents(Long userId, ConsentRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        if (!Boolean.TRUE.equals(dto.getTermsAgreed())
                || !Boolean.TRUE.equals(dto.getPrivacyAgreed())
                || !Boolean.TRUE.equals(dto.getAgeConfirmed())) {
            throw new IllegalArgumentException(
                    "이용약관·개인정보 수집·이용·만 14세 이상 동의는 필수입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        user.setTermsAgreedAt(now);
        user.setPrivacyAgreedAt(now);
        user.setAgeConfirmedAt(now);
        audit(userId, TermsType.TERMS_OF_SERVICE, true, now);
        audit(userId, TermsType.PRIVACY_POLICY, true, now);
        audit(userId, TermsType.AGE_14, true, now);

        if (Boolean.TRUE.equals(dto.getLocationInfoAgreed())) {
            user.setLocationInfoAgreedAt(now);
            audit(userId, TermsType.LOCATION_INFO, true, now);
        }

        // 마케팅: 선택. 동의/철회 모두 이력으로 남긴다.
        boolean marketing = Boolean.TRUE.equals(dto.getMarketingAgreed());
        user.setMarketingAgreedAt(marketing ? now : null);
        audit(userId, TermsType.MARKETING, marketing, now);

        userRepository.save(user);
    }

    /**
     * 위치정보 동의만 단건 수집/철회 (GPS 출퇴근 진입 시점에 사용).
     */
    @Transactional
    public void recordLocationConsent(Long userId, boolean agreed) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now();
        user.setLocationInfoAgreedAt(agreed ? now : null);
        audit(userId, TermsType.LOCATION_INFO, agreed, now);
        userRepository.save(user);
    }

    private void audit(Long userId, TermsType type, boolean agreed, LocalDateTime at) {
        termsAgreementRepository.save(
                TermsAgreement.of(userId, type, TermsVersions.current(type), agreed, at));
    }
}
