package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.ShiftSwapRequest;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.SwapRequestStatus;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.ShiftSwapRequestResponse;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.ShiftSwapRequestRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 대타 구하기 — 상태 전이(중복 지원 409, 승인 시 시프트 재배정, 과거 시프트 400) 검증(H2).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShiftSwapServiceTest {

    @Autowired private ShiftSwapService service;
    @Autowired private ShiftSwapRequestRepository swapRepo;
    @Autowired private WorkShiftRepository shiftRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;

    private Store store;
    private EmployeeProfile original;   // 원 배정 직원
    private EmployeeProfile applicant;  // 지원 직원
    private WorkShift futureShift;
    private int bizSeq = 0;

    @BeforeEach
    void setUp() {
        String biz = String.format("%010d", 8880002220L + (bizSeq++));
        store = storeRepo.save(new Store("스왑매장", biz, "02-888-0002", "카페", 11_000, 100));
        original = employee("swap-orig@t.co", "원배정");
        applicant = employee("swap-appl@t.co", "지원자");
        futureShift = shiftRepo.save(WorkShift.create(
                original.getId(), store.getId(), LocalDate.now().plusDays(1),
                LocalTime.of(10, 0), LocalTime.of(15, 0), null));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        EmployeeProfile p = empRepo.save(new EmployeeProfile(u));
        relRepo.save(new EmployeeStoreRelation(p, store));
        return p;
    }

    @Test
    @DisplayName("모집 생성 — OPEN 상태, 같은 시프트 재모집은 409(Conflict)")
    void createAndDuplicateConflict() {
        ShiftSwapRequestResponse res = service.create(futureShift.getId());
        assertThat(res.status()).isEqualTo(SwapRequestStatus.OPEN);
        assertThat(res.originalEmployeeId()).isEqualTo(original.getId());
        assertThat(res.shiftDate()).isEqualTo(futureShift.getShiftDate());

        assertThatThrownBy(() -> service.create(futureShift.getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("이미 지난 시프트는 모집 생성 400(IllegalArgument)")
    void pastShiftRejected() {
        WorkShift past = shiftRepo.save(WorkShift.create(
                original.getId(), store.getId(), LocalDate.now().minusDays(1),
                LocalTime.of(10, 0), LocalTime.of(15, 0), null));

        assertThatThrownBy(() -> service.create(past.getId()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("지원 — 중복 지원은 409, 원 배정자 본인 지원은 400")
    void applyRules() {
        Long requestId = service.create(futureShift.getId()).id();

        service.apply(requestId, applicant.getId());
        assertThatThrownBy(() -> service.apply(requestId, applicant.getId()))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.apply(requestId, original.getId()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("승인 — 시프트 배정 직원이 승인자로 교체되고 FILLED 전이, 재승인·마감 후 지원은 409")
    void approveReassignsShift() {
        Long requestId = service.create(futureShift.getId()).id();
        service.apply(requestId, applicant.getId());

        ShiftSwapRequestResponse res = service.approve(requestId, applicant.getId());

        assertThat(res.status()).isEqualTo(SwapRequestStatus.FILLED);
        assertThat(res.approvedEmployeeId()).isEqualTo(applicant.getId());
        WorkShift reloaded = shiftRepo.findById(futureShift.getId()).orElseThrow();
        assertThat(reloaded.getEmployeeId()).isEqualTo(applicant.getId());

        // 마감된 모집엔 재승인·지원 불가(409)
        assertThatThrownBy(() -> service.approve(requestId, applicant.getId()))
                .isInstanceOf(ConflictException.class);
        EmployeeProfile late = employee("swap-late@t.co", "늦은지원자");
        assertThatThrownBy(() -> service.apply(requestId, late.getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("지원하지 않은 직원 승인은 400")
    void approveNonApplicantRejected() {
        Long requestId = service.create(futureShift.getId()).id();

        assertThatThrownBy(() -> service.approve(requestId, applicant.getId()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("취소 — CANCELLED 전이, 마감된 모집 취소는 409")
    void cancelTransition() {
        Long requestId = service.create(futureShift.getId()).id();
        service.cancel(requestId);

        ShiftSwapRequest reloaded = swapRepo.findById(requestId).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(SwapRequestStatus.CANCELLED);
        assertThatThrownBy(() -> service.cancel(requestId))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("목록 — 상태 필터와 지원자(이름·지원시각) 포함")
    void listWithApplicants() {
        Long requestId = service.create(futureShift.getId()).id();
        service.apply(requestId, applicant.getId());

        List<ShiftSwapRequestResponse> open = service.list(store.getId(), SwapRequestStatus.OPEN);
        assertThat(open).hasSize(1);
        assertThat(open.get(0).applicants()).hasSize(1);
        assertThat(open.get(0).applicants().get(0).id()).isEqualTo(applicant.getId());
        assertThat(open.get(0).applicants().get(0).name()).isEqualTo("지원자");
        assertThat(open.get(0).applicants().get(0).appliedAt()).isNotNull();

        assertThat(service.list(store.getId(), SwapRequestStatus.FILLED)).isEmpty();
    }
}
