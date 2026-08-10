package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.PayrollBatchResultDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 매장 활성 직원 전체에 대한 일괄 급여 계산 오케스트레이션 (사장 정산 플로우 PRD_OWNER S-301).
 *
 * <p>이전에는 이 오케스트레이션 루프가 {@code PayrollService.calculatePayrollForStore} 안에 있었고,
 * 같은 {@code @Transactional}(REQUIRED) 메서드 안에서 직원마다 {@code this.calculatePayroll(...)}를
 * 자기호출했다. 자기호출은 Spring AOP 프록시를 우회하므로 실질적으로 모든 직원이 "하나의" 트랜잭션을
 * 공유했고, 한 직원의 저장 실패(예: 유니크 제약 위반)가 트랜잭션을 rollback-only 로 마킹해 이후 순서의
 * 다른 모든 직원까지 {@code UnexpectedRollbackException} 으로 연쇄 실패시켰다(2026-07-14 Phase3
 * 재실측 발견 — 재계산 요청 1건이 매장 전체 정산을 500 으로 날림).</p>
 *
 * <p>월별 배치({@link PayrollMonthlyBatchScheduler})와 동일한 패턴으로, 직원 1명당
 * {@link PayrollBatchExecutor#calculateForEmployee(Long, Long, LocalDate, LocalDate, boolean)}를
 * {@code REQUIRES_NEW} 독립 트랜잭션으로 호출한다. {@code PayrollService}에 직접 의존하지 않고
 * {@code PayrollBatchExecutor}(단방향: 실행기 → PayrollService)만 의존해 순환 참조를 피한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollStoreBatchService {

    /**
     * 퇴사자인데 정산기간에 근무기록이 있어 <b>수동 최종정산이 필요</b>하다는 신호.
     * 계산 실패(오류)가 아니라 의도적 보류이므로 FE 가 문구를 달리 낼 수 있게 코드를 분리한다.
     */
    public static final String RESIGNED_NEEDS_MANUAL_SETTLEMENT = "PAYROLL_RESIGNED_NEEDS_MANUAL_SETTLEMENT";

    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollBatchExecutor payrollBatchExecutor;

    /**
     * 매장 활성 직원 전체에 대한 일괄 급여 계산.
     * recalculate=true 고정(정산 마법사에서 같은 기간을 다시 계산하는 용도) — 기존-급여 갱신/방어
     * (PAID·CONFIRMED 재계산 거부 등)는 {@code PayrollService.calculatePayroll}이 담당한다.
     * 직원 한 명의 계산 실패는 REQUIRES_NEW 독립 트랜잭션 덕분에 다른 직원에게 전혀 영향을 주지 않는다.
     */
    public PayrollBatchResultDto calculatePayrollForStore(Long storeId, LocalDate startDate, LocalDate endDate) {
        List<EmployeeStoreRelation> all = employeeStoreRelationRepository.findByStore_Id(storeId);
        List<EmployeeStoreRelation> relations = all.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .toList();

        List<PayrollDto> result = new ArrayList<>();
        List<PayrollBatchResultDto.FailedEmployee> failed = new ArrayList<>();
        reportResignedWithWork(all, storeId, startDate, endDate, failed);
        for (EmployeeStoreRelation rel : relations) {
            if (rel.getEmployeeProfile() == null) continue;
            Long employeeId = rel.getEmployeeProfile().getId();
            try {
                Payroll p = payrollBatchExecutor.calculateForEmployee(employeeId, storeId, startDate, endDate, true);
                result.add(PayrollDto.from(p));
            } catch (Exception e) {
                // REQUIRES_NEW 독립 트랜잭션이라 이미 커밋된 다른 직원의 결과에 영향을 주지 않는다.
                // 다만 실패를 로그에만 남기면 사장님이 누락을 인지할 수 없으므로 응답에 함께 싣는다.
                log.warn("매장 일괄 정산 실패 emp={} store={} reason={}",
                        employeeId, storeId, e.getMessage());
                failed.add(new PayrollBatchResultDto.FailedEmployee(
                        employeeId, resolveEmployeeName(rel), resolveErrorCode(e), e.getMessage()));
            }
        }
        return new PayrollBatchResultDto(result, failed);
    }

    /**
     * 정산기간에 근무기록이 있는 <b>퇴사(비활성) 직원</b>을 결과에 함께 보고한다 (RELEASE_GATES T-13).
     *
     * <p>이전에는 활성 직원만 대상으로 삼아, 정산기간 중간에 퇴사한 직원이 성공 목록에도 실패 목록에도
     * 나타나지 않고 <b>조용히 빠졌다</b>. 사장님 입장에서는 응답 어디에도 단서가 없어 미정산을 인지할
     * 수 없는데, 근로기준법 §36 은 퇴직 후 14일 이내 금품청산을 요구한다.</p>
     *
     * <p>⚠️ <b>여기서 급여를 자동 계산하지는 않는다.</b> 퇴사일이 업무상 날짜로 저장되지 않아
     * (관계 비활성 플래그와 처리 시각만 남는다) 월급제는 일할되지 않고 전액이 나가고, 퇴사 주의
     * 주휴수당 발생 여부도 확정되지 않았다 — 둘 다 노무사 회신 사항이다(G-15). 잘못된 금액을
     * 자동으로 만드는 것보다 <b>사람에게 넘기는 편이 안전</b>하므로, 알리기만 한다.</p>
     *
     * <p>근무기록이 없는 퇴사자는 정산할 것이 없으므로 조용히 넘어간다 — 과거 퇴사자 전원을 매달
     * 경고로 띄우면 경고 자체가 무시된다.</p>
     */
    private void reportResignedWithWork(List<EmployeeStoreRelation> all, Long storeId,
                                        LocalDate startDate, LocalDate endDate,
                                        List<PayrollBatchResultDto.FailedEmployee> failed) {
        for (EmployeeStoreRelation rel : all) {
            if (Boolean.TRUE.equals(rel.getIsActive()) || rel.getEmployeeProfile() == null) {
                continue;
            }
            Long employeeId = rel.getEmployeeProfile().getId();
            boolean workedInPeriod = attendanceRepository
                    .existsByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetween(
                            employeeId, storeId, startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
            if (!workedInPeriod) {
                continue;
            }
            log.info("퇴사 직원의 정산기간 근무기록 발견 — 수동 최종정산 안내 emp={} store={}", employeeId, storeId);
            failed.add(new PayrollBatchResultDto.FailedEmployee(
                    employeeId, resolveEmployeeName(rel),
                    RESIGNED_NEEDS_MANUAL_SETTLEMENT,
                    "퇴사 처리된 직원이지만 이 정산기간에 근무기록이 있습니다. 최종 정산은 직원별로 직접 확인해 주세요."));
        }
    }

    private String resolveErrorCode(Exception e) {
        return (e instanceof BusinessException businessException && businessException.getErrorCode() != null)
                ? businessException.getErrorCode()
                : "UNKNOWN";
    }

    private String resolveEmployeeName(EmployeeStoreRelation relation) {
        return relation.getEmployeeProfile() != null && relation.getEmployeeProfile().getUser() != null
                ? relation.getEmployeeProfile().getUser().getName()
                : null;
    }
}
