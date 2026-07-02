package com.rich.sodam.service;

import com.rich.sodam.domain.BreakRecord;
import com.rich.sodam.dto.request.BreakRecordCreateRequest;
import com.rich.sodam.dto.response.BreakRecordResponse;
import com.rich.sodam.repository.BreakRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 휴게 부여 증빙 서비스 (L-NEW-04, §54). 부여 기록 생성/조회/삭제. 권한 검증은 컨트롤러(StoreAccessGuard).
 *
 * <p>주의: 임금계산과 완전히 독립. Attendance/WorkHoursCalculator 를 참조하지 않는다(회귀 방지).
 */
@Service
@RequiredArgsConstructor
public class BreakRecordService {

    /** §54: 4시간 이상 근무 시 휴게 부여 의무가 발생한다(증빙 누락 경고 임계). */
    private static final int BREAK_REQUIRED_WORK_MINUTES = 4 * 60;

    private final BreakRecordRepository repository;

    @Transactional
    public BreakRecordResponse add(Long employeeId, Long storeId, BreakRecordCreateRequest req) {
        BreakRecord saved = repository.save(BreakRecord.create(
                employeeId, storeId, req.getWorkDate(),
                req.getBreakMinutes(), req.isGrantedConfirmed(), req.getMemo()));
        return BreakRecordResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<BreakRecordResponse> listForEmployee(Long employeeId, Long storeId) {
        return repository.findByEmployeeIdAndStoreIdOrderByWorkDateDescCreatedAtDesc(employeeId, storeId).stream()
                .map(BreakRecordResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long storeId, Long recordId) {
        BreakRecord record = repository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("휴게 기록을 찾을 수 없어요: " + recordId));
        if (!record.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 휴게 기록이 아니에요.");
        }
        repository.delete(record);
    }

    /**
     * (선택 헬퍼) 4시간 이상 근무한 날인데 휴게 부여 기록이 없으면 경고(true).
     *
     * <p>임금계산에 관여하지 않고, 호출부가 명시적으로 근무분(workedMinutes)을 넘겨야 한다.
     * Attendance 를 직접 조회하지 않으므로 임금 도메인과 결합하지 않는다.
     */
    @Transactional(readOnly = true)
    public boolean isBreakEvidenceMissing(Long employeeId, Long storeId, LocalDate workDate, int workedMinutes) {
        if (workedMinutes < BREAK_REQUIRED_WORK_MINUTES) {
            return false;
        }
        return repository.findByEmployeeIdAndStoreIdAndWorkDate(employeeId, storeId, workDate).isEmpty();
    }
}
