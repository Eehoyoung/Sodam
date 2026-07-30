package com.rich.sodam.service;

import com.rich.sodam.domain.type.RecordedBy;
import com.rich.sodam.dto.request.BreakRecordCreateRequest;
import com.rich.sodam.dto.response.BreakRecordResponse;
import com.rich.sodam.repository.BreakRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 휴게 부여 증빙 (L-NEW-04, §54) — 생성·조회·삭제·증빙누락 경고.
 *
 * <p>임금계산 무관: Attendance/WorkHoursCalculator 미참조. 별도 테이블 단독 검증.
 */
@DataJpaTest
@ActiveProfiles("test")
@Import(BreakRecordService.class)
class BreakRecordServiceTest {

    @Autowired
    private BreakRecordService service;

    @Autowired
    private BreakRecordRepository repository;

    private BreakRecordCreateRequest req(LocalDate workDate, int minutes) {
        BreakRecordCreateRequest r = new BreakRecordCreateRequest();
        r.setWorkDate(workDate);
        r.setBreakMinutes(minutes);
        r.setGrantedConfirmed(true);
        r.setMemo("점심 휴게");
        return r;
    }

    @Test
    @DisplayName("휴게 부여 기록 생성·조회")
    void createAndList() {
        LocalDate date = LocalDate.of(2026, 6, 16);
        BreakRecordResponse saved = service.add(10L, 1L, req(date, 60));

        assertThat(saved.id()).isNotNull();
        assertThat(saved.breakMinutes()).isEqualTo(60);
        assertThat(saved.grantedConfirmed()).isTrue();

        List<BreakRecordResponse> list = service.listForEmployee(10L, 1L);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).workDate()).isEqualTo(date);
        assertThat(list.get(0).memo()).isEqualTo("점심 휴게");
    }

    @Test
    @DisplayName("최근 근무일 우선 정렬")
    void listOrderedByWorkDateDesc() {
        service.add(10L, 1L, req(LocalDate.of(2026, 6, 10), 30));
        service.add(10L, 1L, req(LocalDate.of(2026, 6, 16), 60));

        List<BreakRecordResponse> list = service.listForEmployee(10L, 1L);

        assertThat(list).extracting(BreakRecordResponse::workDate)
                .containsExactly(LocalDate.of(2026, 6, 16), LocalDate.of(2026, 6, 10));
    }

    @Test
    @DisplayName("다른 매장 휴게 기록 삭제 시 거부")
    void deleteRejectsOtherStore() {
        BreakRecordResponse saved = service.add(10L, 1L, req(LocalDate.of(2026, 6, 16), 60));

        assertThatThrownBy(() -> service.delete(2L, saved.id()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(repository.findById(saved.id())).isPresent();
    }

    @Test
    @DisplayName("삭제 후 목록에서 사라짐")
    void deleteRemoves() {
        BreakRecordResponse saved = service.add(10L, 1L, req(LocalDate.of(2026, 6, 16), 60));
        service.delete(1L, saved.id());

        assertThat(service.listForEmployee(10L, 1L)).isEmpty();
    }

    @Test
    @DisplayName("4시간↑ 근무인데 휴게기록 없으면 증빙누락 경고")
    void breakEvidenceMissing() {
        LocalDate date = LocalDate.of(2026, 6, 16);

        // 4시간 미만 근무 → 의무 없음 → 경고 아님
        assertThat(service.isBreakEvidenceMissing(10L, 1L, date, 3 * 60)).isFalse();
        // 4시간↑ 근무인데 기록 없음 → 경고
        assertThat(service.isBreakEvidenceMissing(10L, 1L, date, 5 * 60)).isTrue();

        // 부여 기록 추가하면 경고 해제
        service.add(10L, 1L, req(date, 30));
        assertThat(service.isBreakEvidenceMissing(10L, 1L, date, 5 * 60)).isFalse();
    }

    // ── 직원 실시간 기록(startByEmployee/completeByEmployee) ──────────────────────────────

    @Test
    @DisplayName("직원 휴게 시작→종료: recordedBy=EMPLOYEE, breakMinutes 자동계산")
    void employeeStartAndComplete() {
        BreakRecordResponse started = service.startByEmployee(10L, 1L);

        assertThat(started.id()).isNotNull();
        assertThat(started.recordedBy()).isEqualTo(RecordedBy.EMPLOYEE);
        assertThat(started.breakStartTime()).isNotNull();
        assertThat(started.breakEndTime()).isNull();
        assertThat(started.grantedConfirmed()).isFalse();

        BreakRecordResponse completed = service.completeByEmployee(10L, 1L, started.id());

        assertThat(completed.breakEndTime()).isNotNull();
        assertThat(completed.grantedConfirmed()).isTrue();
        assertThat(completed.breakMinutes()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("이미 진행 중인 휴게가 있으면 재시작 시 거부(IllegalStateException, 400)")
    void employeeStart_duplicateRejected() {
        service.startByEmployee(10L, 1L);

        assertThatThrownBy(() -> service.startByEmployee(10L, 1L))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("사장의 기존 사후입력 기록이 있어도 직원 실시간 시작은 막히지 않는다(회귀 방지)")
    void employeeStart_masterRecordDoesNotBlock() {
        // 사장이 사후입력한 기록(breakStartTime/EndTime 둘 다 null)이 이미 존재해도
        service.add(10L, 1L, req(LocalDate.of(2026, 6, 16), 60));

        BreakRecordResponse started = service.startByEmployee(10L, 1L);

        assertThat(started.recordedBy()).isEqualTo(RecordedBy.EMPLOYEE);
    }

    @Test
    @DisplayName("종료 후 재시작은 허용된다(직전 기록이 완료 상태이므로 중복 아님)")
    void employeeStart_afterCompleteAllowsRestart() {
        BreakRecordResponse first = service.startByEmployee(10L, 1L);
        service.completeByEmployee(10L, 1L, first.id());

        BreakRecordResponse second = service.startByEmployee(10L, 1L);

        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(second.breakEndTime()).isNull();
    }

    @Test
    @DisplayName("타 직원 것을 종료하려는 시도 시 거부(AccessDeniedException, 403)")
    void employeeComplete_otherEmployeeRejected() {
        BreakRecordResponse started = service.startByEmployee(10L, 1L);

        assertThatThrownBy(() -> service.completeByEmployee(99L, 1L, started.id()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("다른 매장 기록을 종료하려는 시도 시 거부(AccessDeniedException, 403)")
    void employeeComplete_otherStoreRejected() {
        BreakRecordResponse started = service.startByEmployee(10L, 1L);

        assertThatThrownBy(() -> service.completeByEmployee(10L, 2L, started.id()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("본인 휴게 기록 목록에는 사장 사후입력과 직원 실시간 기록이 함께 조회된다")
    void listForEmployeeSelf_includesBothSources() {
        service.add(10L, 1L, req(LocalDate.of(2026, 6, 16), 60));
        service.startByEmployee(10L, 1L);

        List<BreakRecordResponse> list = service.listForEmployeeSelf(10L, 1L, null, null);

        assertThat(list).hasSize(2);
        assertThat(list).extracting(BreakRecordResponse::recordedBy)
                .containsExactlyInAnyOrder(RecordedBy.MASTER, RecordedBy.EMPLOYEE);
    }
}
