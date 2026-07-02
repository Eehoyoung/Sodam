package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.ShiftTemplateCreateRequest;
import com.rich.sodam.dto.response.ApplyTemplateResponse;
import com.rich.sodam.dto.response.ShiftTemplateResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 시프트 템플릿 서비스 통합 테스트 — 스냅샷 저장·적용(요일→날짜)·비활성 스킵·삭제·타매장 가드.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShiftTemplateServiceTest {

    @Autowired private ShiftTemplateService shiftTemplateService;
    @Autowired private WorkShiftRepository workShiftRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 3334445550L + (bizSeq++));
        return storeRepository.save(new Store("템플릿매장", biz, "02-444-5555", "카페", 10_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private EmployeeStoreRelation assign(EmployeeProfile employee, Store store) {
        return relationRepository.save(new EmployeeStoreRelation(employee, store, 12_000));
    }

    private void createShift(Store store, Long employeeId, LocalDate date, int startH, int endH) {
        workShiftRepository.save(WorkShift.create(
                employeeId, store.getId(), date, LocalTime.of(startH, 0), LocalTime.of(endH, 0), "memo"));
    }

    private ShiftTemplateCreateRequest req(String name, LocalDate from, LocalDate to) {
        ShiftTemplateCreateRequest r = new ShiftTemplateCreateRequest();
        r.setName(name);
        r.setFrom(from);
        r.setTo(to);
        return r;
    }

    @Test
    @DisplayName("현재 주 근무를 템플릿으로 스냅샷 저장한다 (요일 패턴)")
    void createFromWeek() {
        Store store = store();
        EmployeeProfile emp = employee("t1@x.com", "직원1");
        assign(emp, store);
        // 2026-06-15(월), 2026-06-16(화)
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 15), 9, 18);
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 16), 10, 15);

        ShiftTemplateResponse res = shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("평일 기본", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)));

        assertThat(res.id()).isNotNull();
        assertThat(res.name()).isEqualTo("평일 기본");
        assertThat(res.entryCount()).isEqualTo(2);
        assertThat(res.entries()).extracting(ShiftTemplateResponse.EntryResponse::dayOfWeek)
                .containsExactlyInAnyOrder(DayOfWeek.MONDAY, DayOfWeek.TUESDAY);
    }

    @Test
    @DisplayName("저장할 근무가 없으면 실패한다")
    void createFromWeekRejectsEmpty() {
        Store store = store();
        assertThatThrownBy(() -> shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("빈템플릿", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("저장할 근무가 없");
    }

    @Test
    @DisplayName("템플릿을 다른 주에 적용하면 요일에 맞춰 근무가 생성된다")
    void applyGeneratesShifts() {
        Store store = store();
        EmployeeProfile emp = employee("t2@x.com", "직원2");
        assign(emp, store);
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 15), 9, 18);  // 월
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 16), 10, 15); // 화

        ShiftTemplateResponse tpl = shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("평일", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)));

        // 다른 주(2026-06-29 월)에 적용
        LocalDate target = LocalDate.of(2026, 6, 29);
        ApplyTemplateResponse applied = shiftTemplateService.apply(store.getId(), tpl.id(), target);

        assertThat(applied.createdCount()).isEqualTo(2);
        assertThat(applied.skippedCount()).isZero();

        LocalDate monday = target.with(DayOfWeek.MONDAY);
        List<WorkShift> targetWeek = workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(store.getId(), monday, monday.plusDays(6));
        assertThat(targetWeek).extracting(WorkShift::getShiftDate)
                .contains(monday, monday.plusDays(1)); // 월·화 생성
    }

    @Test
    @DisplayName("적용 시 비활성/퇴사 직원 엔트리는 건너뛰고 보고된다")
    void applySkipsInactiveEmployee() {
        Store store = store();
        EmployeeProfile emp = employee("t3@x.com", "직원3");
        EmployeeStoreRelation rel = assign(emp, store);
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 15), 9, 18);

        ShiftTemplateResponse tpl = shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("평일", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)));

        // 직원 비활성화
        rel.setIsActive(false);
        relationRepository.save(rel);

        ApplyTemplateResponse applied = shiftTemplateService.apply(
                store.getId(), tpl.id(), LocalDate.of(2026, 6, 29));

        assertThat(applied.createdCount()).isZero();
        assertThat(applied.skippedCount()).isEqualTo(1);
        assertThat(applied.skipped().get(0).employeeId()).isEqualTo(emp.getId());
    }

    @Test
    @DisplayName("삭제하면 목록에서 사라진다")
    void deleteTemplate() {
        Store store = store();
        EmployeeProfile emp = employee("t4@x.com", "직원4");
        assign(emp, store);
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 15), 9, 18);
        ShiftTemplateResponse tpl = shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("삭제대상", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)));

        shiftTemplateService.delete(store.getId(), tpl.id());

        assertThat(shiftTemplateService.list(store.getId())).isEmpty();
    }

    @Test
    @DisplayName("다른 매장 템플릿은 조회/적용/삭제할 수 없다")
    void foreignStoreGuard() {
        Store store = store();
        Store other = store();
        EmployeeProfile emp = employee("t5@x.com", "직원5");
        assign(emp, store);
        createShift(store, emp.getId(), LocalDate.of(2026, 6, 15), 9, 18);
        ShiftTemplateResponse tpl = shiftTemplateService.createFromWeek(store.getId(), 1L,
                req("내것", LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)));

        assertThatThrownBy(() -> shiftTemplateService.get(other.getId(), tpl.id()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> shiftTemplateService.apply(other.getId(), tpl.id(), LocalDate.of(2026, 6, 29)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
