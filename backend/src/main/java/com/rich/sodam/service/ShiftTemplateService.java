package com.rich.sodam.service;

import com.rich.sodam.domain.ShiftTemplate;
import com.rich.sodam.domain.ShiftTemplateEntry;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.dto.request.ShiftTemplateCreateRequest;
import com.rich.sodam.dto.response.ApplyTemplateResponse;
import com.rich.sodam.dto.response.ShiftTemplateResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.ShiftTemplateRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 시프트 템플릿 서비스 (B10 후속). 매장별 주간 패턴 저장 + 다른 주에 일괄 적용.
 *
 * <p>매장 소유 검증은 컨트롤러(StoreAccessGuard)에서 수행. 여기서는 매장 일관성(findByIdAndStoreId)만 재확인.
 * 적용 시 비활성/퇴사 직원 엔트리는 건너뛰고 결과로 보고한다(직원 고정 + 스킵 정책).
 */
@Service
@RequiredArgsConstructor
public class ShiftTemplateService {

    private final ShiftTemplateRepository templateRepository;
    private final WorkShiftRepository workShiftRepository;
    private final EmployeeStoreRelationRepository relationRepository;

    /** 지정 기간 근무를 요일 패턴으로 스냅샷 저장. */
    @Transactional
    public ShiftTemplateResponse createFromWeek(Long storeId, Long masterId, ShiftTemplateCreateRequest req) {
        validateRange(req.getFrom(), req.getTo());

        List<WorkShift> weekShifts = workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(storeId, req.getFrom(), req.getTo());
        if (weekShifts.isEmpty()) {
            throw new IllegalArgumentException("저장할 근무가 없어요. 먼저 근무를 추가해 주세요.");
        }

        ShiftTemplate template = ShiftTemplate.create(storeId, req.getName().trim(), masterId);
        for (WorkShift s : weekShifts) {
            template.addEntry(ShiftTemplateEntry.create(
                    s.getEmployeeId(), s.getShiftDate().getDayOfWeek(),
                    s.getStartTime(), s.getEndTime(), s.getMemo()));
        }
        return ShiftTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional(readOnly = true)
    public List<ShiftTemplateResponse> list(Long storeId) {
        return templateRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(ShiftTemplateResponse::summary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShiftTemplateResponse get(Long storeId, Long templateId) {
        return ShiftTemplateResponse.from(findOwned(storeId, templateId));
    }

    /**
     * 템플릿을 weekStart가 속한 주(월요일 기준)에 적용. 비활성 직원 엔트리는 스킵.
     */
    @Transactional
    public ApplyTemplateResponse apply(Long storeId, Long templateId, LocalDate weekStart) {
        if (weekStart == null) {
            throw new IllegalArgumentException("적용할 주 시작일을 입력해 주세요.");
        }
        LocalDate monday = weekStart.with(DayOfWeek.MONDAY); // 비-월요일 입력 방어
        ShiftTemplate template = findOwned(storeId, templateId);

        List<ApplyTemplateResponse.SkippedEntry> skipped = new ArrayList<>();
        List<WorkShift> toSave = new ArrayList<>();
        for (ShiftTemplateEntry entry : template.getEntries()) {
            boolean active = relationRepository
                    .existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(entry.getEmployeeId(), storeId);
            if (!active) {
                skipped.add(new ApplyTemplateResponse.SkippedEntry(
                        entry.getEmployeeId(), entry.getDayOfWeek().name(), "비활성 또는 퇴사 직원"));
                continue;
            }
            LocalDate date = monday.plusDays(entry.getDayOfWeek().getValue() - 1L); // MON=1→+0 ... SUN=7→+6
            toSave.add(WorkShift.create(
                    entry.getEmployeeId(), storeId, date,
                    entry.getStartTime(), entry.getEndTime(), entry.getMemo()));
        }
        workShiftRepository.saveAll(toSave); // N+1 → 1 배치 INSERT
        return new ApplyTemplateResponse(templateId, monday, toSave.size(), skipped.size(), skipped);
    }

    @Transactional
    public void delete(Long storeId, Long templateId) {
        templateRepository.delete(findOwned(storeId, templateId));
    }

    private ShiftTemplate findOwned(Long storeId, Long templateId) {
        return templateRepository.findByIdAndStoreId(templateId, storeId)
                .orElseThrow(() -> new IllegalArgumentException("템플릿을 찾을 수 없어요: " + templateId));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("기간 시작일과 종료일을 모두 입력해 주세요.");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("기간 시작일은 종료일보다 늦을 수 없어요.");
        }
    }
}
