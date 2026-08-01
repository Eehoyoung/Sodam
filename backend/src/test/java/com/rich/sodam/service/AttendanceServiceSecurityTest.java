package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.support.AfterCommitExecutor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceSecurityTest {

    @Mock private AttendanceRepository attendanceRepository;
    @Mock private EmployeeProfileRepository employeeProfileRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Mock private LocationVerificationService locationService;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private DomainEventService domainEventService;
    @Mock private LiveSyncPublisher liveSyncPublisher;
    @Mock private MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock private NotificationService notificationService;
    @Mock private NfcVerificationService nfcVerificationService;
    @Mock private AfterCommitExecutor afterCommitExecutor;
    @InjectMocks private AttendanceService attendanceService;

    @Test
    void inactiveEmployeeStoreRelationCannotCreateAutomaticAttendance() {
        EmployeeProfile employee = new EmployeeProfile(new User("former@sodam.dev", "Former employee"));
        Store store = new Store("Store", "1234567890", "02-1234-5678", "Cafe", 10_000, 100);
        EmployeeStoreRelation inactiveRelation = new EmployeeStoreRelation(employee, store, 10_000);
        inactiveRelation.changeActive(false);
        when(employeeStoreRelationRepository.findByEmployeeIdAndStoreIdWithDetails(7L, 3L))
                .thenReturn(Optional.of(inactiveRelation));

        assertThatThrownBy(() -> attendanceService.checkIn(7L, 3L, 37.5, 127.0))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(attendanceRepository);
    }
}
