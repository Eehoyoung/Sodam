package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.CertificateType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * 재직/경력증명서 — 매장 소속(현재/과거)이 아니면 403, 본인 증명서는 PDF 바이트 반환.
 */
@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock
    EmployeeStoreRelationRepository relationRepository;
    @InjectMocks
    CertificateService service;

    private EmployeeStoreRelation relation;

    @BeforeEach
    void setUp() {
        Store store = new Store("증명서테스트매장", "1234567890", "02-1234-5678", "카페", 10_000, 100);
        EmployeeProfile employee = new EmployeeProfile(new User("emp@sodam.dev", "김직원"));
        relation = new EmployeeStoreRelation(employee, store);
    }

    @Test
    @DisplayName("매장 소속(현재/과거)이 아닌 사용자는 AccessDeniedException(403)")
    void deniedWhenNotMember() {
        when(relationRepository.findByEmployeeProfile_IdAndStore_Id(5L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(5L, 1L, CertificateType.EMPLOYMENT))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("재직 중 직원의 재직증명서 — PDF 바이트 반환(%PDF 시그니처)")
    void generatesEmploymentCertificate() {
        when(relationRepository.findByEmployeeProfile_IdAndStore_Id(5L, 1L))
                .thenReturn(Optional.of(relation));

        byte[] pdf = service.generate(5L, 1L, CertificateType.EMPLOYMENT);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("퇴사자(비활성 관계)의 재직증명서 요청은 400 — 경력증명서는 허용")
    void inactiveRelationRules() {
        relation.setIsActive(false);
        when(relationRepository.findByEmployeeProfile_IdAndStore_Id(5L, 1L))
                .thenReturn(Optional.of(relation));

        assertThatThrownBy(() -> service.generate(5L, 1L, CertificateType.EMPLOYMENT))
                .isInstanceOf(IllegalArgumentException.class);

        byte[] career = service.generate(5L, 1L, CertificateType.CAREER);
        assertThat(career).isNotEmpty();
        assertThat(new String(career, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("증명서 종류 누락 시 400")
    void rejectsMissingType() {
        assertThatThrownBy(() -> service.generate(5L, 1L, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
