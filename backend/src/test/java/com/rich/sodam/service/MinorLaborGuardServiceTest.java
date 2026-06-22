package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.MinorGuardResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 연소근로자(만 18세 미만) 가드 (L-NEW-01) — 만 나이 판정·동의 필요 플래그·경계 정확성.
 */
class MinorLaborGuardServiceTest {

    private final EmployeeProfileRepository employeeProfileRepository = mock(EmployeeProfileRepository.class);
    private final MinorLaborGuardService service = new MinorLaborGuardService(employeeProfileRepository);

    private void stubEmployee(long employeeId, LocalDate birthDate) {
        User user = mock(User.class);
        when(user.getBirthDate()).thenReturn(birthDate);
        EmployeeProfile profile = mock(EmployeeProfile.class);
        when(profile.getUser()).thenReturn(user);
        when(employeeProfileRepository.findById(eq(employeeId))).thenReturn(Optional.of(profile));
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
}
