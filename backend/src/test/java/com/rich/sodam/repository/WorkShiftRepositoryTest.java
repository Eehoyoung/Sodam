package com.rich.sodam.repository;

import com.rich.sodam.domain.WorkShift;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkShiftRepositoryTest {

    @Autowired
    private WorkShiftRepository workShiftRepository;

    @Test
    @DisplayName("work shift confirmation fields are persisted")
    void confirmationFieldsArePersisted() {
        WorkShift shift = workShiftRepository.saveAndFlush(shift(1L, LocalDate.of(2026, 7, 1)));

        assertThat(shift.isConfirmed()).isFalse();
        assertThat(shift.getConfirmedAt()).isNull();
        assertThat(shift.isConfirmationNotificationSent()).isFalse();
        assertThat(shift.getConfirmationNotificationSentAt()).isNull();

        shift.confirm();
        shift.markConfirmationNotificationSent();
        WorkShift saved = workShiftRepository.saveAndFlush(shift);

        assertThat(saved.isConfirmed()).isTrue();
        assertThat(saved.getConfirmedAt()).isNotNull();
        assertThat(saved.isConfirmationNotificationSent()).isTrue();
        assertThat(saved.getConfirmationNotificationSentAt()).isNotNull();
    }

    @Test
    @DisplayName("confirmed and pending work shifts can be queried separately")
    void queryByConfirmationState() {
        WorkShift confirmed = shift(1L, LocalDate.of(2026, 7, 1));
        confirmed.confirm();
        workShiftRepository.save(confirmed);
        workShiftRepository.save(shift(2L, LocalDate.of(2026, 7, 2)));
        workShiftRepository.flush();

        LocalDate from = LocalDate.of(2026, 7, 1);
        LocalDate to = LocalDate.of(2026, 7, 31);

        assertThat(workShiftRepository.findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
                100L, from, to))
                .extracting(WorkShift::getEmployeeId)
                .containsExactly(1L);
        assertThat(workShiftRepository.findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNullOrderByShiftDateAsc(
                100L, from, to))
                .extracting(WorkShift::getEmployeeId)
                .containsExactly(2L);
        assertThat(workShiftRepository.findByEmployeeIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
                1L, from, to))
                .containsExactly(confirmed);
    }

    @Test
    @DisplayName("backfilled existing work shifts are excluded from confirmation notification targets")
    void backfilledExistingShiftsAreExcludedFromNotificationTargets() {
        WorkShift existing = shift(1L, LocalDate.of(2026, 7, 1));
        existing.confirm();
        existing.markConfirmationNotificationSent();
        workShiftRepository.saveAndFlush(existing);

        assertThat(workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullAndConfirmationNotificationSentAtIsNullOrderByShiftDateAsc(
                        100L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .isEmpty();
    }

    @Test
    @DisplayName("confirmed work shifts without confirmation notification can be queried")
    void queryConfirmedButNotificationNotSent() {
        WorkShift unsent = shift(1L, LocalDate.of(2026, 7, 1));
        unsent.confirm();
        workShiftRepository.save(unsent);

        WorkShift sent = shift(2L, LocalDate.of(2026, 7, 2));
        sent.confirm();
        sent.markConfirmationNotificationSent();
        workShiftRepository.save(sent);
        workShiftRepository.flush();

        assertThat(workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullAndConfirmationNotificationSentAtIsNullOrderByShiftDateAsc(
                        100L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .containsExactly(unsent);
    }

    private WorkShift shift(Long employeeId, LocalDate date) {
        return WorkShift.create(
                employeeId,
                100L,
                date,
                LocalTime.of(9, 0),
                LocalTime.of(18, 0),
                null);
    }
}
