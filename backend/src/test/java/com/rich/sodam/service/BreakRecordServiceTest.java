package com.rich.sodam.service;

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
}
