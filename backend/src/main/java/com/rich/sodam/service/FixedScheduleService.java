package com.rich.sodam.service;

import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 월급제 정규직 "고정 스케줄" — 근로계약서 발송 시점부터 근무 시프트(WorkShift)를 입사일 기준으로
 * 지속 자동 생성한다(요청: "월급제 정규직은 입사 시점부터 스케줄에 항상 고정").
 *
 * <p><b>설계</b>: 무한한 미래를 한 번에 만들 수 없으므로, 직원-매장 관계에 커서
 * ({@link EmployeeStoreRelation#getFixedScheduleGeneratedThrough()})를 두고 "이 날짜까지는 이미
 * 생성을 마쳤다"를 기록한다. 생성은 항상 커서 다음 날부터 목표일까지만 진행하고, 커서를 목표일로
 * 전진시킨다 — 이미 지난 구간은 사장이 시프트를 이동·수정·삭제했더라도 절대 다시 만들지 않는다
 * (한 번 커서를 넘긴 날짜는 수동 개입 여부와 무관하게 "다뤄진 날짜"로 간주).</p>
 *
 * <p>같은 날짜에 이미 시프트가 있으면(사장이 먼저 수동으로 채워둔 경우) 새로 만들지 않고
 * 건너뛰되, 커서는 그대로 전진시킨다 — 기존 데이터를 존중한다.</p>
 *
 * <p>사장은 생성된 시프트를 기존 스케줄 보드(WorkShiftService.update/delete/reassignEmployee)로
 * 평범한 시프트와 똑같이 이동·수정·삭제할 수 있다 — 새 UI 불필요, 커서 설계 자체가 그 편집을
 * 덮어쓰지 않음을 보장한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FixedScheduleService {

    /** 근로계약서 발송 시 즉시 확보해 두는 초기 생성 구간(주). 그 이후는 조회 시 지연 확장. */
    private static final int INITIAL_HORIZON_WEEKS = 4;
    /** 조회 시 지연 확장(ensureGeneratedThrough) 1회 호출당 최대 확장 폭(주) — 남용 방지. */
    private static final int MAX_LAZY_EXTEND_WEEKS = 12;
    private static final String FIXED_SCHEDULE_MEMO = "고정 스케줄(근로계약서)";

    private final EmployeeStoreRelationRepository relationRepository;
    private final WorkShiftRepository workShiftRepository;

    /**
     * 근로계약서 발송 시 호출 — 월급제(SALARY) + 정규직(PERMANENT) + 스케줄 존재 조건을 모두
     * 만족할 때만 고정 스케줄을 활성화한다. 그 외(시급제·기간제·직접입력 월급제)는 조용히 무시
     * (기존 방식 그대로 사장이 수동으로 시프트를 등록).
     */
    @Transactional
    public void activateFromContract(LaborContract contract) {
        if (contract.getPayType() != LaborContractPayType.SALARY
                || contract.getPeriodType() != ContractPeriodType.PERMANENT
                || contract.getWorkSchedule() == null
                || contract.getWorkSchedule().isEmpty()) {
            return;
        }
        relationRepository.findRelation(contract.getEmployeeId(), contract.getStoreId())
                .ifPresent(relation -> {
                    relation.setFixedWeeklySchedule(contract.getWorkSchedule());
                    if (relation.getFixedScheduleGeneratedThrough() == null) {
                        // 최초 활성화 — 입사일(또는 계약 시작일, 없으면 오늘) 하루 전부터 생성 시작.
                        LocalDate startDate = contract.getStartDate() != null
                                ? contract.getStartDate()
                                : (relation.getHireDate() != null ? relation.getHireDate() : LocalDate.now());
                        relation.setFixedScheduleGeneratedThrough(startDate.minusDays(1));
                    }
                    relationRepository.save(relation);
                    extendGenerationTo(relation, LocalDate.now().plusWeeks(INITIAL_HORIZON_WEEKS));
                });
    }

    /**
     * 매장 스케줄 보드 조회 시 호출 — 고정 스케줄이 있는 활성 직원 전원의 생성 구간을 조회 범위
     * (to, 최대 {@link #MAX_LAZY_EXTEND_WEEKS}주로 클램프)까지 지연 확장한다. 보드를 열 때마다
     * 자연히 최신 상태로 채워지므로 별도 배치·스케줄러가 없어도 "항상 고정"이 유지된다.
     */
    /**
     * REQUIRES_NEW — 호출측(WorkShiftService#listForStore)이 readOnly 트랜잭션이라 그 안에서
     * 그대로 실행하면 새로 생성한 시프트가 커밋되지 않는다(읽기전용 트랜잭션 안 쓰기 무시/오류).
     * 별도 쓰기 트랜잭션으로 분리해 항상 저장을 보장한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureGeneratedThrough(Store store, LocalDate to) {
        LocalDate clampedTo = to.isAfter(LocalDate.now().plusWeeks(MAX_LAZY_EXTEND_WEEKS))
                ? LocalDate.now().plusWeeks(MAX_LAZY_EXTEND_WEEKS)
                : to;
        for (EmployeeStoreRelation relation : relationRepository.findByStoreAndIsActiveTrue(store)) {
            if (relation.getFixedWeeklySchedule() == null || relation.getFixedScheduleGeneratedThrough() == null) {
                continue;
            }
            extendGenerationTo(relation, clampedTo);
        }
    }

    private void extendGenerationTo(EmployeeStoreRelation relation, LocalDate targetDate) {
        List<WorkScheduleDay> schedule = relation.getFixedWeeklySchedule();
        LocalDate cursor = relation.getFixedScheduleGeneratedThrough();
        if (schedule == null || schedule.isEmpty() || cursor == null || !targetDate.isAfter(cursor)) {
            return;
        }
        Long employeeId = relation.getEmployeeProfile().getId();
        Long storeId = relation.getStore().getId();

        Map<DayOfWeek, WorkScheduleDay> byDay = new EnumMap<>(DayOfWeek.class);
        for (WorkScheduleDay day : schedule) {
            byDay.put(day.day(), day);
        }

        List<WorkShift> toCreate = new ArrayList<>();
        for (LocalDate date = cursor.plusDays(1); !date.isAfter(targetDate); date = date.plusDays(1)) {
            WorkScheduleDay day = byDay.get(date.getDayOfWeek());
            if (day == null) {
                continue; // 소정근로일이 아님
            }
            if (workShiftRepository.existsByEmployeeIdAndStoreIdAndShiftDate(employeeId, storeId, date)) {
                continue; // 이미 시프트가 있음(수동 등록 등) — 기존 데이터 존중, 덮어쓰지 않음
            }
            WorkShift shift = WorkShift.create(employeeId, storeId, date, day.startTime(), day.endTime(), FIXED_SCHEDULE_MEMO);
            // 이미 서명 완료된 계약의 고정 스케줄이므로 별도 확정 절차 없이 바로 확정 처리한다.
            shift.confirm();
            toCreate.add(shift);
        }
        if (!toCreate.isEmpty()) {
            workShiftRepository.saveAll(toCreate);
        }
        relation.setFixedScheduleGeneratedThrough(targetDate);
        relationRepository.save(relation);
        log.debug("고정 스케줄 생성: employeeId={} storeId={} 생성건수={} 커서={}",
                employeeId, storeId, toCreate.size(), targetDate);
    }
}
