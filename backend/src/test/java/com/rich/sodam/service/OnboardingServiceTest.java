package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.dto.response.OnboardingResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 직원 온보딩 체크리스트 (M-NEW-05/E-NEW-08) — 단계 완료·다음 단계 선정.
 */
class OnboardingServiceTest {

    private final LaborContractService laborContractService = mock(LaborContractService.class);
    private final EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
    private final AttendanceRepository attendanceRepository = mock(AttendanceRepository.class);
    private final OnboardingService service =
            new OnboardingService(laborContractService, relationRepository, attendanceRepository);

    @Test
    @DisplayName("전 단계 완료 → 3/3, 다음 단계 없음")
    void allComplete() {
        LaborContract signed = mock(LaborContract.class);
        when(signed.isSigned()).thenReturn(true);
        when(laborContractService.findFor(10L, 1L)).thenReturn(List.of(signed));
        when(relationRepository.findByEmployeeProfile_IdAndStore_Id(10L, 1L))
                .thenReturn(Optional.of(mock(EmployeeStoreRelation.class)));
        when(attendanceRepository.existsByEmployeeProfile_IdAndStore_Id(10L, 1L)).thenReturn(true);

        OnboardingResponse res = service.forEmployee(1L, 10L);

        assertThat(res.completedCount()).isEqualTo(3);
        assertThat(res.total()).isEqualTo(3);
        assertThat(res.nextStepKey()).isNull();
    }

    @Test
    @DisplayName("계약 미서명·시급만 설정 → 1/3, 다음=계약서")
    void contractIsNext() {
        when(laborContractService.findFor(20L, 1L)).thenReturn(List.of());
        when(relationRepository.findByEmployeeProfile_IdAndStore_Id(20L, 1L))
                .thenReturn(Optional.of(mock(EmployeeStoreRelation.class)));
        when(attendanceRepository.existsByEmployeeProfile_IdAndStore_Id(20L, 1L)).thenReturn(false);

        OnboardingResponse res = service.forEmployee(1L, 20L);

        assertThat(res.completedCount()).isEqualTo(1);
        assertThat(res.nextStepKey()).isEqualTo("CONTRACT");
        assertThat(res.nextStepLabel()).isEqualTo("근로계약서 서명");
    }
}
