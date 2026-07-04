package com.rich.sodam.service;

import com.rich.sodam.domain.AttendanceApprovalRequest;
import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.ReminderType;
import com.rich.sodam.repository.AttendanceApprovalRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.DailySalesRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.ReminderLogRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 지각·미출근 감지 배치 — ref_id(시프트 ID) 멱등성 + 출근/승인대기 스킵 검증.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OwnerReminderLateCheckInTest {

    @Mock StoreRepository storeRepository;
    @Mock MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock DailySalesRepository dailySalesRepository;
    @Mock ReminderLogRepository reminderLogRepository;
    @Mock NotificationService notificationService;
    @Mock WorkShiftRepository workShiftRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock AttendanceApprovalRequestRepository attendanceApprovalRequestRepository;
    @Mock UserRepository userRepository;
    @InjectMocks OwnerReminderScheduler scheduler;

    @Mock Store store;
    @Mock WorkShift shift;
    @Mock User employee;

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final long SHIFT_ID = 100L;
    private static final long EMPLOYEE_ID = 42L;
    private static final long STORE_ID = 1L;

    @BeforeEach
    void setUp() {
        when(store.getId()).thenReturn(STORE_ID);
        when(store.isActive()).thenReturn(true);
        when(store.getStoreName()).thenReturn("지각테스트매장");
        when(storeRepository.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(masterStoreRelationRepository.findByStore(store)).thenReturn(List.of());

        when(shift.getId()).thenReturn(SHIFT_ID);
        when(shift.getEmployeeId()).thenReturn(EMPLOYEE_ID);
        when(shift.getStoreId()).thenReturn(STORE_ID);
        when(shift.getShiftDate()).thenReturn(TODAY);
        when(shift.getStartTime()).thenReturn(LocalTime.of(9, 0));
        when(workShiftRepository.findByShiftDateAndConfirmedAtIsNotNull(TODAY)).thenReturn(List.of(shift));

        when(employee.getName()).thenReturn("김직원");
        when(userRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employee));

        when(attendanceRepository.existsByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetween(
                eq(EMPLOYEE_ID), eq(STORE_ID), any(), any())).thenReturn(false);
        when(attendanceApprovalRequestRepository.existsByEmployeeIdAndStoreIdAndTypeAndStatus(
                EMPLOYEE_ID, STORE_ID,
                AttendanceApprovalRequest.Type.CHECK_IN, AttendanceApprovalRequest.Status.PENDING))
                .thenReturn(false);
    }

    @Test
    @DisplayName("시작+10분 경과 + 출근 기록 없음 → 1회 발송, 재실행 시 ref_id(시프트) 멱등으로 중복 금지")
    void lateReminderIsIdempotentPerShift() {
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDateAndRefId(
                STORE_ID, ReminderType.SHIFT_LATE, TODAY, SHIFT_ID)).thenReturn(false, true);

        scheduler.remindLateCheckIn(TODAY.atTime(9, 11));
        scheduler.remindLateCheckIn(TODAY.atTime(9, 21)); // 10분 뒤 재실행

        ArgumentCaptor<ReminderLog> captor = ArgumentCaptor.forClass(ReminderLog.class);
        verify(reminderLogRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getReminderType()).isEqualTo(ReminderType.SHIFT_LATE);
        assertThat(captor.getValue().getTargetDate()).isEqualTo(TODAY);
        assertThat(captor.getValue().getRefId()).isEqualTo(SHIFT_ID);
    }

    @Test
    @DisplayName("유예 시간(시작+10분) 이내에는 발송하지 않는다")
    void withinGraceNoReminder() {
        scheduler.remindLateCheckIn(TODAY.atTime(9, 10)); // 정확히 +10분 — 아직 대기

        verify(reminderLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("이미 출근(check-in) 기록이 있으면 스킵")
    void checkedInSkipped() {
        when(attendanceRepository.existsByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetween(
                eq(EMPLOYEE_ID), eq(STORE_ID), any(), any())).thenReturn(true);

        scheduler.remindLateCheckIn(TODAY.atTime(9, 30));

        verify(reminderLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("사장 승인 대기(PENDING CHECK_IN)가 있으면 스킵 — 사장이 이미 인지")
    void pendingApprovalSkipped() {
        when(attendanceApprovalRequestRepository.existsByEmployeeIdAndStoreIdAndTypeAndStatus(
                EMPLOYEE_ID, STORE_ID,
                AttendanceApprovalRequest.Type.CHECK_IN, AttendanceApprovalRequest.Status.PENDING))
                .thenReturn(true);

        scheduler.remindLateCheckIn(TODAY.atTime(9, 30));

        verify(reminderLogRepository, never()).save(any());
    }
}
