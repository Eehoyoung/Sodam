package com.rich.sodam.service;

import com.rich.sodam.domain.StoreNotice;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.NoticeReadRepository;
import com.rich.sodam.repository.StoreNoticeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StoreNoticeServiceSecurityTest {

    @Test
    void inactiveFormerEmployeeCannotAcknowledgeStoreNotice() {
        StoreNoticeRepository noticeRepository = mock(StoreNoticeRepository.class);
        NoticeReadRepository readRepository = mock(NoticeReadRepository.class);
        EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        LiveSyncPublisher liveSyncPublisher = mock(LiveSyncPublisher.class);
        StoreNoticeService service = new StoreNoticeService(
                noticeRepository, readRepository, relationRepository, notificationService, liveSyncPublisher);
        StoreNotice notice = StoreNotice.create(10L, "공지", "내용");

        when(noticeRepository.findById(99L)).thenReturn(Optional.of(notice));
        when(relationRepository.existsByEmployeeProfile_IdAndStore_Id(2L, 10L)).thenReturn(true);
        when(relationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> service.ack(99L, 2L))
                .isInstanceOf(AccessDeniedException.class);

        verify(readRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(liveSyncPublisher, never()).publishStore(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void activeEmployeeCanStillAcknowledgeStoreNotice() {
        StoreNoticeRepository noticeRepository = mock(StoreNoticeRepository.class);
        NoticeReadRepository readRepository = mock(NoticeReadRepository.class);
        EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        LiveSyncPublisher liveSyncPublisher = mock(LiveSyncPublisher.class);
        StoreNoticeService service = new StoreNoticeService(
                noticeRepository, readRepository, relationRepository, notificationService, liveSyncPublisher);
        StoreNotice notice = StoreNotice.create(10L, "Notice", "Body");

        when(noticeRepository.findById(99L)).thenReturn(Optional.of(notice));
        when(relationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L)).thenReturn(true);
        when(readRepository.existsByNoticeIdAndEmployeeId(99L, 2L)).thenReturn(false);

        service.ack(99L, 2L);

        verify(readRepository).save(org.mockito.ArgumentMatchers.any());
        verify(liveSyncPublisher).publishStore(10L, LiveSyncPublisher.SyncType.NOTICE_CHANGED);
    }
}
