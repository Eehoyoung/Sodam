package com.rich.sodam.service;

import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 근무 시프트 서비스 (B10/E-NEW-05). 사장 등록·삭제 + 매장/직원 본인 기간 조회.
 *
 * <p>매장 소유 검증은 컨트롤러(StoreAccessGuard)에서 수행. 삭제 시 매장 소유 일관성만 재확인.
 * 스코프: 등록·조회만 — 자동배정·채용 없음(Non-Goal).
 */
@Service
@RequiredArgsConstructor
public class WorkShiftService {

    private final WorkShiftRepository repository;

    @Transactional
    public WorkShiftResponse create(Long storeId, WorkShiftCreateRequest req) {
        WorkShift shift = repository.save(WorkShift.create(
                req.getEmployeeId(), storeId, req.getShiftDate(),
                req.getStartTime(), req.getEndTime(), req.getMemo()));
        return WorkShiftResponse.from(shift);
    }

    /** 매장 기간 조회(사장). */
    @Transactional(readOnly = true)
    public List<WorkShiftResponse> listForStore(Long storeId, LocalDate from, LocalDate to) {
        return repository.findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(storeId, from, to).stream()
                .map(WorkShiftResponse::from)
                .toList();
    }

    /** 직원 본인 기간 조회. */
    @Transactional(readOnly = true)
    public List<WorkShiftResponse> listForEmployee(Long employeeId, LocalDate from, LocalDate to) {
        return repository.findByEmployeeIdAndShiftDateBetweenOrderByShiftDateAsc(employeeId, from, to).stream()
                .map(WorkShiftResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long storeId, Long shiftId) {
        WorkShift shift = repository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("근무 일정을 찾을 수 없어요: " + shiftId));
        if (!shift.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 근무 일정이 아니에요.");
        }
        repository.delete(shift);
    }
}
