package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.request.WorkShiftNotifyRequest;
import com.rich.sodam.dto.request.WorkShiftUpdateRequest;
import com.rich.sodam.dto.response.WorkShiftNotifyResponse;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
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
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;
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

    private User owner(Store store) {
        User u = new User("owner-store" + store.getId() + "@x.com", "사장" + store.getId());
        u = userRepository.save(u);
        MasterProfile master = masterProfileRepository.save(new MasterProfile(u));
        masterStoreRelationRepository.save(new MasterStoreRelation(master, store));
        return u;
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
    @DisplayName("야간 시프트(종료<시작)는 익일 종료로 허용되고 crossesMidnight=true")
    void createAllowsOvernightShift() {
        Store store = store();
        EmployeeProfile emp = employee("night@x.com", "야간직원");
        assign(emp, store);

        WorkShiftCreateRequest r = req(emp.getId(), LocalDate.of(2026, 6, 17), "마감");
        r.setStartTime(LocalTime.of(18, 0));
        r.setEndTime(LocalTime.of(2, 0)); // 익일 02:00

        WorkShiftResponse res = workShiftService.create(store.getId(), r);

        assertThat(res.crossesMidnight()).isTrue();
        assertThat(res.startTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(res.endTime()).isEqualTo(LocalTime.of(2, 0));
    }

    @Test
    @DisplayName("시작·종료 시각이 같으면 0시간 근무라 거부된다")
    void rejectsZeroLengthShift() {
        Store store = store();
        EmployeeProfile emp = employee("zero@x.com", "동일시각");
        assign(emp, store);

        WorkShiftCreateRequest r = req(emp.getId(), LocalDate.of(2026, 6, 17), "동일");
        r.setStartTime(LocalTime.of(9, 0));
        r.setEndTime(LocalTime.of(9, 0));

        assertThatThrownBy(() -> workShiftService.create(store.getId(), r))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("같을 수 없어요");
    }

    @Test
    @DisplayName("시프트 수정: 시각·메모가 갱신되고 확정 상태가 리셋된다")
    void updateResetsConfirmation() {
        Store store = store();
        EmployeeProfile emp = employee("upd@x.com", "수정직원");
        assign(emp, store);

        WorkShiftResponse created = workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "초안"));

        // 확정 처리
        WorkShiftNotifyRequest notifyReq = new WorkShiftNotifyRequest();
        notifyReq.setFrom(LocalDate.of(2026, 6, 15));
        notifyReq.setTo(LocalDate.of(2026, 6, 21));
        workShiftService.notifyConfirmed(store.getId(), notifyReq);
        assertThat(workShiftRepository.findById(created.id()).orElseThrow().isConfirmed()).isTrue();

        WorkShiftUpdateRequest upd = new WorkShiftUpdateRequest();
        upd.setShiftDate(LocalDate.of(2026, 6, 18));
        upd.setStartTime(LocalTime.of(13, 0));
        upd.setEndTime(LocalTime.of(22, 0));
        upd.setMemo("수정됨");

        WorkShiftResponse res = workShiftService.update(store.getId(), created.id(), upd);

        assertThat(res.shiftDate()).isEqualTo(LocalDate.of(2026, 6, 18));
        assertThat(res.startTime()).isEqualTo(LocalTime.of(13, 0));
        assertThat(res.memo()).isEqualTo("수정됨");
        WorkShift reloaded = workShiftRepository.findById(created.id()).orElseThrow();
        assertThat(reloaded.isConfirmed()).isFalse();
        assertThat(reloaded.isConfirmationNotificationSent()).isFalse();
    }

    @Test
    @DisplayName("동시 편집: 오래된 버전으로 수정하면 낙관적 락 충돌(409 매핑 예외)이 발생한다")
    void updateDetectsStaleVersionConflict() {
        Store store = store();
        EmployeeProfile emp = employee("verconf@x.com", "버전충돌");
        assign(emp, store);

        WorkShiftResponse created = workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "초안"));
        Long staleVersion = created.version();

        // 사장 웹 콘솔: 조회 당시 버전으로 먼저 수정 — 성공한다.
        WorkShiftUpdateRequest first = new WorkShiftUpdateRequest();
        first.setShiftDate(LocalDate.of(2026, 6, 18));
        first.setStartTime(LocalTime.of(10, 0));
        first.setEndTime(LocalTime.of(19, 0));
        first.setMemo("사장 수정");
        first.setVersion(staleVersion);
        workShiftService.update(store.getId(), created.id(), first);
        // 테스트가 하나의 트랜잭션(persistence context)을 공유하므로, 실제 HTTP 요청 커밋 시 자연히
        // 일어나는 버전 증가를 관찰하려면 명시적으로 플러시해야 한다(운영에서는 요청 트랜잭션 커밋 시점에
        // 자동으로 발생 — 서비스 코드에 별도 flush 를 추가하지는 않는다).
        workShiftRepository.flush();
        WorkShift afterFirst = workShiftRepository.findById(created.id()).orElseThrow();
        assertThat(afterFirst.getVersion()).isNotEqualTo(staleVersion);

        // 직원 앱: 최초 조회 당시(오래된) 버전 그대로 수정 시도 — 낙관적 락 충돌
        WorkShiftUpdateRequest second = new WorkShiftUpdateRequest();
        second.setShiftDate(LocalDate.of(2026, 6, 19));
        second.setStartTime(LocalTime.of(9, 0));
        second.setEndTime(LocalTime.of(18, 0));
        second.setMemo("직원 앱 수정(경쟁)");
        second.setVersion(staleVersion);

        assertThatThrownBy(() -> workShiftService.update(store.getId(), created.id(), second))
                .isInstanceOf(org.springframework.orm.ObjectOptimisticLockingFailureException.class);

        // 충돌한 두 번째 시도는 반영되지 않고 첫 번째 수정 내용이 유지된다
        WorkShift reloaded = workShiftRepository.findById(created.id()).orElseThrow();
        assertThat(reloaded.getMemo()).isEqualTo("사장 수정");
    }

    @Test
    @DisplayName("버전을 보내지 않으면(구버전 클라이언트 호환) 낙관적 락 검증 없이 수정된다")
    void updateWithoutVersionSkipsConflictCheck() {
        Store store = store();
        EmployeeProfile emp = employee("noverconf@x.com", "버전없음");
        assign(emp, store);

        WorkShiftResponse created = workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "초안"));

        WorkShiftUpdateRequest upd = new WorkShiftUpdateRequest();
        upd.setShiftDate(LocalDate.of(2026, 6, 18));
        upd.setStartTime(LocalTime.of(10, 0));
        upd.setEndTime(LocalTime.of(19, 0));
        upd.setMemo("버전 미지정 수정");
        // upd.setVersion(...) 호출하지 않음 — null

        WorkShiftResponse res = workShiftService.update(store.getId(), created.id(), upd);
        assertThat(res.memo()).isEqualTo("버전 미지정 수정");
    }

    @Test
    @DisplayName("다른 매장의 시프트는 수정할 수 없다")
    void updateFailsForForeignStore() {
        Store store = store();
        Store otherStore = store();
        EmployeeProfile emp = employee("foreign-upd@x.com", "직원");
        assign(emp, store);
        WorkShiftResponse created = workShiftService.create(store.getId(),
                req(emp.getId(), LocalDate.of(2026, 6, 17), "초안"));

        WorkShiftUpdateRequest upd = new WorkShiftUpdateRequest();
        upd.setShiftDate(LocalDate.of(2026, 6, 18));
        upd.setStartTime(LocalTime.of(9, 0));
        upd.setEndTime(LocalTime.of(18, 0));

        assertThatThrownBy(() -> workShiftService.update(otherStore.getId(), created.id(), upd))
                .isInstanceOf(AccessDeniedException.class);
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

    @Test
    @DisplayName("HC-5: 다음 주 확정 근무가 52시간을 넘는 DANGER 예측이 있어도 스케줄 확정 자체는 성공한다(차단 아님)")
    void confirmSucceedsEvenWithDangerForecast() {
        Store store = store();
        owner(store);
        EmployeeProfile emp = employee("danger-confirm@x.com", "과로예정직원");
        assign(emp, store);

        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);
        for (int d = 0; d < 4; d++) { // 13h × 4일 = 52h → SCHEDULE_52H_FORECAST DANGER
            WorkShiftCreateRequest r = req(emp.getId(), nextMonday.plusDays(d), "과로주");
            r.setStartTime(LocalTime.of(8, 0));
            r.setEndTime(LocalTime.of(21, 0));
            workShiftService.create(store.getId(), r);
        }

        WorkShiftNotifyRequest notifyReq = new WorkShiftNotifyRequest();
        notifyReq.setFrom(nextMonday);
        notifyReq.setTo(nextMonday.plusDays(6));

        WorkShiftNotifyResponse response = workShiftService.notifyConfirmed(store.getId(), notifyReq);

        // 경고가 있어도 확정 자체는 그대로 성공(HC-5) — DB에도 confirmedAt이 실제로 찍힌다.
        assertThat(response.confirmedCount()).isEqualTo(4);
        assertThat(workShiftRepository.findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(
                        store.getId(), nextMonday, nextMonday.plusDays(6)))
                .allMatch(WorkShift::isConfirmed);
        // 확정 성공과 별개로, 사장에게 사전 경고 알림도 나갔다(경고가 확정을 막지 않으면서도 알려는 준다).
        verify(notificationService, atLeastOnce())
                .notifyLaborRiskDetected(anyLong(), anyString(), anyString(), anyString());
    }
}
