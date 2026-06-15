package com.rich.sodam.service;

import com.rich.sodam.domain.TermsAgreement;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TermsType;
import com.rich.sodam.dto.request.ConsentRequestDto;
import com.rich.sodam.repository.TermsAgreementRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsentServiceTest {

    @Mock
    UserRepository userRepository;
    @Mock
    TermsAgreementRepository termsAgreementRepository;
    @InjectMocks
    ConsentService consentService;

    private ConsentRequestDto allRequired() {
        ConsentRequestDto dto = new ConsentRequestDto();
        dto.setTermsAgreed(true);
        dto.setPrivacyAgreed(true);
        dto.setAgeConfirmed(true);
        return dto;
    }

    @Test
    @DisplayName("필수 동의 시 User 타임스탬프 설정 + 이력 적재")
    void recordsRequiredConsents() {
        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        consentService.recordConsents(1L, allRequired());

        assertThat(user.hasCompletedRequiredConsents()).isTrue();
        verify(termsAgreementRepository, atLeast(3)).save(any(TermsAgreement.class));
    }

    @Test
    @DisplayName("필수 동의 누락 시 거부(IllegalArgumentException)")
    void rejectsMissingRequiredConsent() {
        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        ConsentRequestDto dto = allRequired();
        dto.setPrivacyAgreed(false);

        assertThatThrownBy(() -> consentService.recordConsents(1L, dto))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(user.hasCompletedRequiredConsents()).isFalse();
    }

    @Test
    @DisplayName("위치정보 동의 포함 시 위치 타임스탬프 설정")
    void recordsLocationConsent() {
        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        ConsentRequestDto dto = allRequired();
        dto.setLocationInfoAgreed(true);

        consentService.recordConsents(1L, dto);

        assertThat(user.hasAgreedLocationInfo()).isTrue();
    }

    @Test
    @DisplayName("위치정보 단건 철회 시 타임스탬프 제거 + 철회 이력")
    void revokeLocationConsent() {
        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        consentService.recordLocationConsent(1L, false);

        assertThat(user.hasAgreedLocationInfo()).isFalse();
        ArgumentCaptor<TermsAgreement> captor = ArgumentCaptor.forClass(TermsAgreement.class);
        verify(termsAgreementRepository).save(captor.capture());
        List<TermsAgreement> saved = captor.getAllValues();
        assertThat(saved.get(0).getTermsType()).isEqualTo(TermsType.LOCATION_INFO);
        assertThat(saved.get(0).isAgreed()).isFalse();
    }
}
