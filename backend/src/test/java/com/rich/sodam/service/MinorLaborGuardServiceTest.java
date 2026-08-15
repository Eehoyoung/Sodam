package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.DocumentType;
import com.rich.sodam.dto.response.MinorGuardResponse;
import com.rich.sodam.repository.EmployeeDocumentRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 연소근로자(만 18세 미만) 가드 (L-NEW-01) — 만 나이 판정·동의 필요 플래그·경계 정확성.
 * WP-5: 친권자 동의서/가족관계증명서/취직인허증 보유 체크리스트 + 만 14세 미만 개인정보 처리 차단 경고.
 */
class MinorLaborGuardServiceTest {

    private final EmployeeProfileRepository employeeProfileRepository = mock(EmployeeProfileRepository.class);
    private final EmployeeDocumentRepository employeeDocumentRepository = mock(EmployeeDocumentRepository.class);
    private final MinorLaborGuardService service =
            new MinorLaborGuardService(employeeProfileRepository, employeeDocumentRepository);

    private void stubEmployee(long employeeId, LocalDate birthDate) {
        User user = mock(User.class);
        when(user.getBirthDate()).thenReturn(birthDate);
        EmployeeProfile profile = mock(EmployeeProfile.class);
        when(profile.getUser()).thenReturn(user);
        when(employeeProfileRepository.findById(eq(employeeId))).thenReturn(Optional.of(profile));
    }

    /** 기본값: 서류함에 아무 것도 없음(전부 미보유). */
    private void stubNoDocuments() {
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(any(), any(), any())).thenReturn(false);
    }

    @Test
    @DisplayName("만 17세 → 미성년·친권자 동의 필요·야간 제한 true")
    void minor17() {
        LocalDate today = LocalDate.now();
        stubEmployee(1L, today.minusYears(17));

        MinorGuardResponse res = service.evaluate(1L, 10L);

        assertThat(res.minor()).isTrue();
        assertThat(res.age()).isEqualTo(17);
        assertThat(res.consentRequired()).isTrue();
        assertThat(res.nightWorkRestricted()).isTrue();
        assertThat(res.dailyHourLimit()).isEqualTo(7);
        assertThat(res.weeklyHourLimit()).isEqualTo(35);
        assertThat(res.guidance()).contains("연소근로자");
        assertThat(res.disclaimer()).isNotBlank();
    }

    @Test
    @DisplayName("만 19세 → 미성년 false·동의 불필요")
    void notMinor19() {
        LocalDate today = LocalDate.now();
        stubEmployee(2L, today.minusYears(19));

        MinorGuardResponse res = service.evaluate(2L, 10L);

        assertThat(res.minor()).isFalse();
        assertThat(res.age()).isEqualTo(19);
        assertThat(res.consentRequired()).isFalse();
        assertThat(res.nightWorkRestricted()).isFalse();
        assertThat(res.guidance()).contains("이상");
    }

    @Test
    @DisplayName("생년월일 없음 → 미성년 false·나이 null·unknown 안내")
    void unknownWhenNoBirthDate() {
        stubEmployee(3L, null);

        MinorGuardResponse res = service.evaluate(3L, 10L);

        assertThat(res.minor()).isFalse();
        assertThat(res.age()).isNull();
        assertThat(res.consentRequired()).isFalse();
        assertThat(res.guidance()).contains("확인할 수 없어요");
    }

    @Test
    @DisplayName("만 나이 경계: 18번째 생일 전날은 17세(미성년), 생일 당일은 18세(비미성년)")
    void ageBoundaryAroundBirthday() {
        LocalDate today = LocalDate.now();

        // 내일이 18번째 생일 → 오늘은 아직 만 17세
        LocalDate birthTomorrow18 = today.plusDays(1).minusYears(18);
        assertThat(service.isMinor(birthTomorrow18, today)).isTrue();
        assertThat(service.isMinor(birthTomorrow18, today)).isTrue();

        // 오늘이 18번째 생일 → 오늘부터 만 18세(비미성년)
        LocalDate birthToday18 = today.minusYears(18);
        assertThat(service.isMinor(birthToday18, today)).isFalse();
    }

    @Test
    @DisplayName("isMinor: birthDate 또는 asOf 가 null 이면 false")
    void isMinorNullSafe() {
        assertThat(service.isMinor(null, LocalDate.now())).isFalse();
        assertThat(service.isMinor(LocalDate.now().minusYears(15), null)).isFalse();
    }

    @Test
    @DisplayName("WP-5: 서류함에 등록된 친권자 동의서·가족관계증명서·취직인허증을 체크리스트로 그대로 반영한다")
    void reflectsDocumentChecklistFromExistingDocumentDomain() {
        LocalDate today = LocalDate.now();
        stubEmployee(4L, today.minusYears(16));
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(4L, 10L, DocumentType.GUARDIAN_CONSENT))
                .thenReturn(true);
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(4L, 10L, DocumentType.FAMILY_RELATION_CERTIFICATE))
                .thenReturn(true);
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(4L, 10L, DocumentType.WORK_PERMIT))
                .thenReturn(false);

        MinorGuardResponse res = service.evaluate(4L, 10L);

        assertThat(res.guardianConsentOnFile()).isTrue();
        assertThat(res.familyRelationCertOnFile()).isTrue();
        assertThat(res.workPermitOnFile()).isFalse();
    }

    @Test
    @DisplayName("WP-5: 만 13세 + 친권자 동의서 미보유 → 개인정보 처리 차단 경고 true")
    void blocksPersonalDataProcessingUnder14WithoutConsent() {
        LocalDate today = LocalDate.now();
        stubEmployee(5L, today.minusYears(13));
        stubNoDocuments();

        MinorGuardResponse res = service.evaluate(5L, 10L);

        assertThat(res.personalDataProcessingBlocked()).isTrue();
        assertThat(res.guidance()).contains("법정대리인").contains("동의");
    }

    @Test
    @DisplayName("WP-5: 만 13세라도 친권자 동의서가 서류함에 있으면 차단 경고를 내리지 않는다")
    void doesNotBlockUnder14WhenConsentOnFile() {
        LocalDate today = LocalDate.now();
        stubEmployee(6L, today.minusYears(13));
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(6L, 10L, DocumentType.GUARDIAN_CONSENT))
                .thenReturn(true);
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(6L, 10L, DocumentType.FAMILY_RELATION_CERTIFICATE))
                .thenReturn(false);
        when(employeeDocumentRepository.existsByEmployeeIdAndStoreIdAndType(6L, 10L, DocumentType.WORK_PERMIT))
                .thenReturn(false);

        MinorGuardResponse res = service.evaluate(6L, 10L);

        assertThat(res.personalDataProcessingBlocked()).isFalse();
    }

    @Test
    @DisplayName("WP-5 경계: 만 14세(경계 충족)는 개인정보 처리 차단 대상이 아니다 — 13세만 대상")
    void doesNotBlockExactly14() {
        LocalDate today = LocalDate.now();
        stubEmployee(7L, today.minusYears(14));
        stubNoDocuments();

        MinorGuardResponse res = service.evaluate(7L, 10L);

        assertThat(res.minor()).isTrue(); // 여전히 연소근로자(18세 미만)
        assertThat(res.personalDataProcessingBlocked()).isFalse(); // 14세부터는 §22의2 대상 아님
    }

    @Test
    @DisplayName("WP-5: 만 19세(비미성년)는 친권자 동의서가 없어도 개인정보 처리 차단 대상이 아니다")
    void adultNeverBlocked() {
        LocalDate today = LocalDate.now();
        stubEmployee(8L, today.minusYears(19));
        stubNoDocuments();

        MinorGuardResponse res = service.evaluate(8L, 10L);

        assertThat(res.personalDataProcessingBlocked()).isFalse();
    }
}
