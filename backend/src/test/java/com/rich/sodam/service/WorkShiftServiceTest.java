package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
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

/**
 * 근무 시프트 서비스 (B10/E-NEW-05) 통합 테스트 — 등록·매장 기간조회·본인 기간조회.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkShiftServiceTest {

    @Autowired private WorkShiftService workShiftService;
    @Autowired private WorkShiftRepository workShiftRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 2223334440L + (bizSeq++));
        return storeRepository.save(new Store("시프트매장", biz, "02-333-4444", "카페", 10_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private WorkShiftCreateRequest req(Long employeeId, LocalDate date, String memo) {
        WorkShiftCreateRequest r = new WorkShiftCreateRequest();
        r.setEmployeeId(employeeId);
        r.setShiftDate(date);
        r.setStartTime(LocalTime.of(9, 0));
        r.setEndTime(LocalTime.of(18, 0));
        r.setMemo(memo);
        return r;
    }

    @Test
    @DisplayName("사장이 시프트를 등록하면 저장되고 응답에 반영된다")
    void create() {
        Store store = store();
        EmployeeProfile emp = employee("s1@x.com", "직원1");

        WorkShiftResponse res = workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "오픈"));

        assertThat(res.id()).isNotNull();
        assertThat(res.employeeId()).isEqualTo(emp.getId());
        assertThat(res.storeId()).isEqualTo(store.getId());
        assertThat(res.startTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(res.endTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(res.memo()).isEqualTo("오픈");
        assertThat(workShiftRepository.findById(res.id())).isPresent();
    }

    @Test
    @DisplayName("매장 기간 조회: 범위 내 일정만, 일자 오름차순")
    void listForStore() {
        Store store = store();
        EmployeeProfile emp = employee("s2@x.com", "직원2");

        workShiftService.create(store.getId(), req(emp.getId(), LocalDate.of(2026, 6, 18), "둘째"));
        workShiftService.create(store.getId(), req(emp.getId(), LocalDate.of(2026, 6, 16), "첫째"));
        // 범위 밖
        workShiftService.create(store.getId(), req(emp.getId(), LocalDate.of(2026, 7, 1), "범위밖"));

        List<WorkShiftResponse> list = workShiftService.listForStore(
                store.getId(), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21));

        assertThat(list).hasSize(2);
        assertThat(list.get(0).shiftDate()).isEqualTo(LocalDate.of(2026, 6, 16));
        assertThat(list.get(1).shiftDate()).isEqualTo(LocalDate.of(2026, 6, 18));
    }

    @Test
    @DisplayName("본인 기간 조회: 다른 직원 일정은 섞이지 않는다")
    void listForEmployee() {
        Store store = store();
        EmployeeProfile me = employee("me@x.com", "나");
        EmployeeProfile other = employee("other@x.com", "남");

        workShiftService.create(store.getId(), req(me.getId(), LocalDate.of(2026, 6, 17), "내것"));
        workShiftService.create(store.getId(), req(other.getId(), LocalDate.of(2026, 6, 17), "남것"));

        List<WorkShiftResponse> mine = workShiftService.listForEmployee(
                me.getId(), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21));

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).employeeId()).isEqualTo(me.getId());
        assertThat(mine.get(0).memo()).isEqualTo("내것");
    }
}
