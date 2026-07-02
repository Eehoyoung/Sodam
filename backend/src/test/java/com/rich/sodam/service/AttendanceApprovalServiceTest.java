package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceApprovalRequest.Status;
import com.rich.sodam.domain.AttendanceApprovalRequest.Type;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceApprovalRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.AttendanceApprovalService.AttendanceApprovalResponseHolder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 사장 승인 출퇴근 서비스 테스트 — 요청 생성·승인(요청 시각 기록)·거절·중복/비소속 가드.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceApprovalServiceTest {

    @Autowired private AttendanceApprovalService service;
    @Autowired private AttendanceApprovalRequestRepository repo;
    @Autowired private UserRepository userRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;
    @Autowired private AttendanceRepository attendanceRepo;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 4445556660L + (bizSeq++));
        return storeRepo.save(new Store("승인매장", biz, "02-555-6666", "카페", 10_000, 100));
    }

    /** EmployeeProfile.id == User.id (@MapsId). */
    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    private void assign(EmployeeProfile emp, Store store) {
        relRepo.save(new EmployeeStoreRelation(emp, store, 12_000));
    }

    @Test
    @DisplayName("직원이 승인 출근을 요청하면 PENDING 으로 생성된다")
    void requestCreatesPending() {
        Store store = store();
        EmployeeProfile emp = employee("a1@x.com", "김알바");
        assign(emp, store);

        AttendanceApprovalResponseHolder h = service.request(emp.getId(), store.getId(), Type.CHECK_IN);

        assertThat(h.request().getStatus()).isEqualTo(Status.PENDING);
        assertThat(h.request().getType()).isEqualTo(Type.CHECK_IN);
        assertThat(h.employeeName()).isEqualTo("김알바");
        assertThat(repo.findByStoreIdAndStatusOrderByRequestedAtDesc(store.getId(), Status.PENDING)).hasSize(1);
    }

    @Test
    @DisplayName("매장 비소속 직원의 요청은 거부된다")
    void requestRejectsNonMember() {
        Store store = store();
        EmployeeProfile outsider = employee("out@x.com", "외부인");
        assertThatThrownBy(() -> service.request(outsider.getId(), store.getId(), Type.CHECK_IN))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("같은 유형의 대기중 요청이 있으면 중복 요청은 거부된다")
    void requestRejectsDuplicatePending() {
        Store store = store();
        EmployeeProfile emp = employee("dup@x.com", "중복");
        assign(emp, store);
        service.request(emp.getId(), store.getId(), Type.CHECK_IN);
        assertThatThrownBy(() -> service.request(emp.getId(), store.getId(), Type.CHECK_IN))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("대기 중");
    }

    @Test
    @DisplayName("사장 승인 시 요청한 시각으로 출근이 기록된다")
    void approveCheckInRecordsAtRequestedTime() {
        Store store = store();
        EmployeeProfile emp = employee("ci@x.com", "출근직원");
        assign(emp, store);

        AttendanceApprovalResponseHolder req = service.request(emp.getId(), store.getId(), Type.CHECK_IN);
        LocalDateTime requestedTime = req.request().getRequestedTime();

        AttendanceApprovalResponseHolder approved = service.approve(req.request().getId());

        assertThat(approved.request().getStatus()).isEqualTo(Status.APPROVED);
        assertThat(approved.request().getResultAttendanceId()).isNotNull();

        Attendance att = attendanceRepo.findById(approved.request().getResultAttendanceId()).orElseThrow();
        assertThat(att.getCheckInTime()).isEqualTo(requestedTime);
        assertThat(att.getCheckOutTime()).isNull();
        // 위치 없이 기록 — GPS 좌표는 null
        assertThat(att.getCheckInLatitude()).isNull();
    }

    @Test
    @DisplayName("출근 후 퇴근 승인 시 요청한 시각으로 퇴근이 기록된다")
    void approveCheckOutRecordsAtRequestedTime() {
        Store store = store();
        EmployeeProfile emp = employee("co@x.com", "퇴근직원");
        assign(emp, store);

        // 먼저 출근 요청+승인
        service.approve(service.request(emp.getId(), store.getId(), Type.CHECK_IN).request().getId());

        // 퇴근 요청+승인
        AttendanceApprovalResponseHolder coReq = service.request(emp.getId(), store.getId(), Type.CHECK_OUT);
        LocalDateTime requestedOut = coReq.request().getRequestedTime();
        AttendanceApprovalResponseHolder coApproved = service.approve(coReq.request().getId());

        Attendance att = attendanceRepo.findById(coApproved.request().getResultAttendanceId()).orElseThrow();
        assertThat(att.getCheckOutTime()).isEqualTo(requestedOut);
    }

    @Test
    @DisplayName("거절하면 REJECTED 와 사유가 기록된다")
    void rejectSetsRejected() {
        Store store = store();
        EmployeeProfile emp = employee("rj@x.com", "거절직원");
        assign(emp, store);
        AttendanceApprovalResponseHolder req = service.request(emp.getId(), store.getId(), Type.CHECK_IN);

        AttendanceApprovalResponseHolder rejected = service.reject(req.request().getId(), "오늘 미출근");

        assertThat(rejected.request().getStatus()).isEqualTo(Status.REJECTED);
        assertThat(rejected.request().getRejectReason()).isEqualTo("오늘 미출근");
        // 거절은 출근 기록을 만들지 않음
        assertThat(attendanceRepo.findAll()).isEmpty();
    }

    @Test
    @DisplayName("이미 처리된 요청은 다시 승인할 수 없다")
    void cannotApproveTwice() {
        Store store = store();
        EmployeeProfile emp = employee("tw@x.com", "중복승인");
        assign(emp, store);
        List<Long> ids = List.of(service.request(emp.getId(), store.getId(), Type.CHECK_IN).request().getId());
        service.approve(ids.get(0));
        assertThatThrownBy(() -> service.approve(ids.get(0)))
                .isInstanceOf(IllegalStateException.class);
    }
}
