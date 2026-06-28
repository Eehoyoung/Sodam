package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.request.WorkShiftNotifyRequest;
import com.rich.sodam.dto.response.WorkShiftNotifyResponse;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

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
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @MockBean private NotificationService notificationService;

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

    private void assign(EmployeeProfile employee, Store store) {
        relationRepository.save(new EmployeeStoreRelation(employee, store, 12_000));
    }

    private void assignInactive(EmployeeProfile employee, Store store) {
        EmployeeStoreRelation relation = new EmployeeStoreRelation(employee, store, 12_000);
        relation.setIsActive(false);
        relationRepository.save(relation);
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
        assign(emp, store);

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
        assign(emp, store);

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
    @DisplayName("본인 기간 조회: 확정된 내 일정만 조회된다")
    void listForEmployee() {
        Store store = store();
        EmployeeProfile me = employee("me@x.com", "나");
        EmployeeProfile other = employee("other@x.com", "남");
        assign(me, store);
        assign(other, store);

        workShiftService.create(store.getId(), req(me.getId(), LocalDate.of(2026, 6, 17), "내것"));
        workShiftService.create(store.getId(), req(other.getId(), LocalDate.of(2026, 6, 17), "남것"));

        assertThat(workShiftService.listForEmployee(
                me.getId(), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21)))
                .isEmpty();

        WorkShiftNotifyRequest notifyReq = new WorkShiftNotifyRequest();
        notifyReq.setFrom(LocalDate.of(2026, 6, 15));
        notifyReq.setTo(LocalDate.of(2026, 6, 21));
        workShiftService.notifyConfirmed(store.getId(), notifyReq);

        List<WorkShiftResponse> mine = workShiftService.listForEmployee(
                me.getId(), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21));

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).employeeId()).isEqualTo(me.getId());
        assertThat(mine.get(0).memo()).isEqualTo("내것");
    }

    @Test
    @DisplayName("매장 소속이 아닌 직원의 시프트 생성은 실패한다")
    void createFailsWhenEmployeeDoesNotBelongToStore() {
        Store targetStore = store();
        Store otherStore = store();
        EmployeeProfile emp = employee("outsider@x.com", "타매장직원");
        assign(emp, otherStore);

        assertThatThrownBy(() -> workShiftService.create(targetStore.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "오픈")))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(workShiftRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("비활성 소속 직원의 시프트 생성은 실패한다")
    void createFailsWhenEmployeeRelationIsInactive() {
        Store store = store();
        EmployeeProfile emp = employee("inactive@x.com", "비활성직원");
        assignInactive(emp, store);

        assertThatThrownBy(() -> workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "오픈")))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(workShiftRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("확정 알림 요청 기간이 비어 있거나 역전되면 실패한다")
    void notifyConfirmedRejectsInvalidRange() {
        Store store = store();

        assertThatThrownBy(() -> workShiftService.notifyConfirmed(store.getId(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("요청");

        WorkShiftNotifyRequest missingFrom = new WorkShiftNotifyRequest();
        missingFrom.setTo(LocalDate.of(2026, 6, 21));
        assertThatThrownBy(() -> workShiftService.notifyConfirmed(store.getId(), missingFrom))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("시작일");

        WorkShiftNotifyRequest missingTo = new WorkShiftNotifyRequest();
        missingTo.setFrom(LocalDate.of(2026, 6, 15));
        assertThatThrownBy(() -> workShiftService.notifyConfirmed(store.getId(), missingTo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("종료일");

        WorkShiftNotifyRequest reversed = new WorkShiftNotifyRequest();
        reversed.setFrom(LocalDate.of(2026, 6, 22));
        reversed.setTo(LocalDate.of(2026, 6, 21));
        assertThatThrownBy(() -> workShiftService.notifyConfirmed(store.getId(), reversed))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("늦을 수 없어요");
    }

    @Test
    @DisplayName("기간 내 미확정 시프트를 확정하고 알림 미발송 대상 직원에게 한 번씩 보낸다")
    void notifyConfirmedSendsToScheduledEmployeesInPeriod() {
        Store store = store();
        EmployeeProfile first = employee("notify1@x.com", "알림1");
        EmployeeProfile second = employee("notify2@x.com", "알림2");
        EmployeeProfile outside = employee("notify3@x.com", "범위밖");
        assign(first, store);
        assign(second, store);
        assign(outside, store);

        workShiftService.create(store.getId(), req(first.getId(), LocalDate.of(2026, 6, 16), "첫째"));
        workShiftService.create(store.getId(), req(first.getId(), LocalDate.of(2026, 6, 18), "둘째"));
        workShiftService.create(store.getId(), req(second.getId(), LocalDate.of(2026, 6, 21), "주말"));
        workShiftService.create(store.getId(), req(outside.getId(), LocalDate.of(2026, 6, 22), "범위밖"));

        WorkShiftNotifyRequest notifyReq = new WorkShiftNotifyRequest();
        notifyReq.setFrom(LocalDate.of(2026, 6, 15));
        notifyReq.setTo(LocalDate.of(2026, 6, 21));

        WorkShiftNotifyResponse response = workShiftService.notifyConfirmed(store.getId(), notifyReq);

        assertThat(response.confirmedCount()).isEqualTo(3);
        assertThat(response.notifiedCount()).isEqualTo(2);
        assertThat(first.getUser().getId()).isEqualTo(first.getId());
        assertThat(second.getUser().getId()).isEqualTo(second.getId());
        verify(notificationService).notifyWorkShiftConfirmed(
                eq(first.getUser().getId()), eq("시프트매장"), eq("2026-06-15~2026-06-21"));
        verify(notificationService).notifyWorkShiftConfirmed(
                eq(second.getUser().getId()), eq("시프트매장"), eq("2026-06-15~2026-06-21"));
        verify(notificationService, never()).notifyWorkShiftConfirmed(
                eq(outside.getUser().getId()), eq("시프트매장"), eq("2026-06-15~2026-06-21"));

        assertThat(workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
                        store.getId(), notifyReq.getFrom(), notifyReq.getTo()))
                .hasSize(3);
        assertThat(workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullAndConfirmationNotificationSentAtIsNullOrderByShiftDateAsc(
                        store.getId(), notifyReq.getFrom(), notifyReq.getTo()))
                .isEmpty();

        reset(notificationService);
        WorkShiftNotifyResponse secondResponse = workShiftService.notifyConfirmed(store.getId(), notifyReq);

        assertThat(secondResponse.confirmedCount()).isZero();
        assertThat(secondResponse.notifiedCount()).isZero();
        verifyNoInteractions(notificationService);
    }
}
