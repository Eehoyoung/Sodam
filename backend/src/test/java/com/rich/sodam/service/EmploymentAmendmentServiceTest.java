package com.rich.sodam.service;

import com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.EmploymentAmendment;
import com.rich.sodam.domain.type.EmploymentAmendmentStatus;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.dto.request.EmploymentAmendmentCreateRequest;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.access.AccessDeniedException;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmploymentAmendmentServiceTest {
    @Mock StoreAccessGuard guard;
    @Mock EmploymentAmendmentRepository amendmentRepository;
    @Mock EmployeeStoreRelationRepository relationRepository;
    @Mock MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock EmploymentTypeChangeLogRepository employmentTypeChangeLogRepository;
    @Mock ElectronicSignatureApplicationService electronicSignatureService;
    @Mock StoreRepository storeRepository;
    @Mock UserRepository userRepository;
    @Mock MonthlySalaryCalculator monthlySalaryCalculator;
    @InjectMocks EmploymentAmendmentService service;

    @Test
    void verifiedAmendmentAppliesOnlyAtEffectiveDate() {
        EmploymentAmendment amendment = EmploymentAmendment.draft(
                10L, 20L, 30L, LocalDate.now(), EmploymentType.MONTHLY_SALARY,
                null, 3_000_000, 40.0, 5);
        amendment.startSigning(900L, 1);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.setId(77L);
        when(amendmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(amendment));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));

        service.markVerified(100L, 900L, 1, LocalDateTime.now());

        assertThat(amendment.getStatus()).isEqualTo(EmploymentAmendmentStatus.APPLIED);
        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(relation.getMonthlySalary()).isEqualTo(3_000_000);
        assertThat(relation.getContractedWeeklyHours()).isEqualTo(40.0);
        verify(relationRepository).save(relation);
    }

    @Test
    void futureEffectiveDateKeepsExistingTermsUntilSchedulerRuns() {
        EmploymentAmendment amendment = EmploymentAmendment.draft(
                10L, 20L, 30L, LocalDate.now().plusDays(10), EmploymentType.HOURLY,
                12_000, null, 20.0, 5);
        amendment.startSigning(901L, 1);
        when(amendmentRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(amendment));

        service.markVerified(101L, 901L, 1, LocalDateTime.now());

        assertThat(amendment.getStatus()).isEqualTo(EmploymentAmendmentStatus.VERIFIED);
        verifyNoInteractions(relationRepository);
    }

    @Test
    void draftCanBeCancelledWithoutChangingEmploymentTerms() {
        EmploymentAmendment amendment = EmploymentAmendment.draft(
                10L, 20L, 30L, LocalDate.now(), EmploymentType.HOURLY,
                12_000, null, 20.0, 5);
        when(amendmentRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(amendment));

        service.cancelDraft(30L, 10L, 102L);

        assertThat(amendment.getStatus()).isEqualTo(EmploymentAmendmentStatus.CANCELLED);
        verifyNoInteractions(relationRepository);
    }

    @Test
    void verifiedAmendmentForInactiveRelationIsCancelledWithoutChangingEmploymentTerms() {
        EmploymentAmendment amendment = EmploymentAmendment.draft(
                10L, 20L, 30L, LocalDate.now(), EmploymentType.HOURLY,
                12_000, null, 20.0, 5);
        amendment.startSigning(902L, 1);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.changeActive(false);
        when(amendmentRepository.findByIdForUpdate(103L)).thenReturn(Optional.of(amendment));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));

        service.markVerified(103L, 902L, 1, LocalDateTime.now());

        assertThat(amendment.getStatus()).isEqualTo(EmploymentAmendmentStatus.CANCELLED);
        verify(relationRepository, never()).save(any());
    }

    @Test
    void inactiveFormerEmployeeCannotReceiveANewEmploymentAmendmentDraft() {
        EmploymentAmendmentCreateRequest request = new EmploymentAmendmentCreateRequest(
                20L, LocalDate.now(), EmploymentType.HOURLY, 12_000, null, 20.0, 5);
        doThrow(new AccessDeniedException("inactive employee"))
                .when(guard).assertActiveEmployeeInStore(20L, 10L);

        assertThatThrownBy(() -> service.createDraft(30L, 10L, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(amendmentRepository);
    }
}
