package com.rich.sodam.service;

import com.rich.sodam.domain.MonthOffset;
import com.rich.sodam.domain.OperatingHours;
import com.rich.sodam.domain.PayrollCycle;
import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.ReminderType;
import com.rich.sodam.repository.DailySalesRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.ReminderLogRepository;
import com.rich.sodam.repository.StoreRepository;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 사장 리마인더 배치 — reminder_log 멱등성(같은 날 재실행 시 중복 발송 금지) 검증.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OwnerReminderSchedulerTest {

    @Mock
    StoreRepository storeRepository;
    @Mock
    MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock
    DailySalesRepository dailySalesRepository;
    @Mock
    ReminderLogRepository reminderLogRepository;
    @Mock
    NotificationService notificationService;
    @Mock
    com.rich.sodam.repository.WorkShiftRepository workShiftRepository;
    @Mock
    com.rich.sodam.repository.AttendanceRepository attendanceRepository;
    @Mock
    com.rich.sodam.repository.AttendanceApprovalRequestRepository attendanceApprovalRequestRepository;
    @Mock
    com.rich.sodam.repository.UserRepository userRepository;
    @InjectMocks
    OwnerReminderScheduler scheduler;

    @Mock
    Store store;

    // 2026-07-06 은 월요일 — 기본 운영시간(월~토 09:00~18:00, 일 휴무)
    private static final LocalDate MONDAY = LocalDate.of(2026, 7, 6);

    @BeforeEach
    void setUp() {
        when(store.getId()).thenReturn(1L);
        when(store.isActive()).thenReturn(true);
        when(store.getStoreName()).thenReturn("리마인더테스트매장");
        when(store.getOperatingHours()).thenReturn(OperatingHours.createDefault());
        when(storeRepository.findAll()).thenReturn(List.of(store));
        when(masterStoreRelationRepository.findByStore(store)).thenReturn(List.of());
    }

    @Test
    @DisplayName("마감 30분 전 윈도 + 오늘 매출 미입력 → 리마인더 1회 기록, 같은 날 재실행 시 중복 발송 금지(멱등)")
    void closeReminderIsIdempotent() {
        LocalDateTime inWindow = MONDAY.atTime(17, 35); // 마감 18:00 → 25분 전
        when(dailySalesRepository.existsByStoreIdAndSaleDate(1L, MONDAY)).thenReturn(false);
        // 첫 실행: 미발송 → 발송, 두 번째 실행: 이미 기록됨 → 스킵
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(
                1L, ReminderType.SALES_CLOSE_REMINDER, MONDAY)).thenReturn(false, true);

        scheduler.remindSalesInput(inWindow);
        scheduler.remindSalesInput(inWindow.plusMinutes(5)); // 같은 윈도 재실행(10분 주기 가정)

        ArgumentCaptor<ReminderLog> captor = ArgumentCaptor.forClass(ReminderLog.class);
        verify(reminderLogRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getStoreId()).isEqualTo(1L);
        assertThat(captor.getValue().getReminderType()).isEqualTo(ReminderType.SALES_CLOSE_REMINDER);
        assertThat(captor.getValue().getTargetDate()).isEqualTo(MONDAY);
    }

    @Test
    @DisplayName("오늘 매출이 이미 입력됐으면 마감 리마인더를 보내지 않는다")
    void closeReminderSkippedWhenSalesEntered() {
        when(dailySalesRepository.existsByStoreIdAndSaleDate(eq(1L), any())).thenReturn(true);

        scheduler.remindSalesInput(MONDAY.atTime(17, 35));

        verify(reminderLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("윈도 밖(마감 10분 전)에는 발송하지 않는다")
    void closeReminderSkippedOutsideWindow() {
        when(dailySalesRepository.existsByStoreIdAndSaleDate(eq(1L), any())).thenReturn(false);

        scheduler.remindSalesInput(MONDAY.atTime(17, 50)); // 마감 10분 전 — 윈도(30~20분 전) 밖

        verify(reminderLogRepository, never()).save(
                argThat(l -> l.getReminderType() == ReminderType.SALES_CLOSE_REMINDER));
    }

    @Test
    @DisplayName("오픈 이후 + 어제(영업일) 매출 미입력 → 어제 매출 재알림 (어제 휴무면 스킵)")
    void yesterdayReminderAfterOpen() {
        LocalDate tuesday = MONDAY.plusDays(1); // 어제=월요일(영업일)
        when(dailySalesRepository.existsByStoreIdAndSaleDate(eq(1L), any())).thenReturn(false);
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(
                eq(1L), any(), any())).thenReturn(false);

        scheduler.remindSalesInput(tuesday.atTime(9, 5)); // 오픈(09:00) 직후

        verify(reminderLogRepository).save(
                argThat(l -> l.getReminderType() == ReminderType.SALES_YESTERDAY_REMINDER
                        && l.getTargetDate().equals(MONDAY)));

        // 월요일 실행 시 어제=일요일(휴무) → 재알림 없음
        clearInvocations(reminderLogRepository);
        scheduler.remindSalesInput(MONDAY.atTime(9, 5));
        verify(reminderLogRepository, never()).save(
                argThat(l -> l.getReminderType() == ReminderType.SALES_YESTERDAY_REMINDER));
    }

    @Test
    @DisplayName("급여일 D-3 — 지급일 3일 전 매장만 발송하고, 재실행 시 멱등")
    void paydayD3Idempotent() {
        // 당월 1일~말일 정산, 당월 10일 지급
        when(store.getPayrollCycle()).thenReturn(PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 1,
                MonthOffset.CURRENT_MONTH, null, true,
                MonthOffset.CURRENT_MONTH, 10, false));
        LocalDate today = LocalDate.of(2026, 7, 7); // 지급일 7/10 → D-3
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(
                1L, ReminderType.PAYDAY_D3, LocalDate.of(2026, 7, 10))).thenReturn(false, true);

        scheduler.remindPaydayD3(today);
        scheduler.remindPaydayD3(today); // 재실행

        verify(reminderLogRepository, times(1)).save(
                argThat(l -> l.getReminderType() == ReminderType.PAYDAY_D3
                        && l.getTargetDate().equals(LocalDate.of(2026, 7, 10))));

        // 지급일이 3일 뒤가 아니면 발송 안 함
        clearInvocations(reminderLogRepository);
        scheduler.remindPaydayD3(LocalDate.of(2026, 7, 8));
        verify(reminderLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("주간 리포트 — 월요일 발송, 같은 주 재실행 시 멱등")
    void weeklyReportIdempotent() {
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(
                1L, ReminderType.WEEKLY_REPORT, MONDAY)).thenReturn(false, true);

        scheduler.remindWeeklyReport(MONDAY);
        scheduler.remindWeeklyReport(MONDAY);

        verify(reminderLogRepository, times(1)).save(
                argThat(l -> l.getReminderType() == ReminderType.WEEKLY_REPORT));
    }

    @Test
    @DisplayName("푸시 발송 실패(FCM 키 없음 등)해도 배치가 죽지 않고 기록은 남는다")
    void pushFailureDoesNotKillBatch() {
        com.rich.sodam.domain.MasterStoreRelation rel = mock(com.rich.sodam.domain.MasterStoreRelation.class);
        com.rich.sodam.domain.MasterProfile profile = mock(com.rich.sodam.domain.MasterProfile.class);
        com.rich.sodam.domain.User user = mock(com.rich.sodam.domain.User.class);
        when(rel.getMasterProfile()).thenReturn(profile);
        when(profile.getUser()).thenReturn(user);
        when(user.getId()).thenReturn(42L);
        when(masterStoreRelationRepository.findByStore(store)).thenReturn(List.of(rel));
        when(reminderLogRepository.existsByStoreIdAndReminderTypeAndTargetDate(any(), any(), any()))
                .thenReturn(false);
        doThrow(new RuntimeException("FCM key not configured"))
                .when(notificationService).push(eq(42L), any());

        scheduler.remindWeeklyReport(MONDAY); // 예외 없이 완료돼야 함

        verify(reminderLogRepository).save(any(ReminderLog.class));
    }
}
