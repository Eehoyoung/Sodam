package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.dto.response.MyLeaveBalanceDto;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 직원 본인용 잔여 연차 조회 (E-NEW-03). 읽기 전용·추정.
 *
 * <p>발생 연차({@link AnnualLeaveEntitlementResolver}, 출근율 100% 가정) − 승인된 휴가 사용일수 = 잔여.
 * 직원이 여러 매장에 소속된 경우 매장별 발생 연차를 합산하고, 승인된 휴가 사용일수도 합산한다.
 * 5인 이상 사업장이 하나라도 있으면 연차 적용 대상으로 본다.</p>
 *
 * <p>실제 출근율·결근·계속근로기간에 따라 달라지므로 결과는 <b>참고용 추정치</b>다(면책 문구 노출).</p>
 */
@Service
@RequiredArgsConstructor
public class MyLeaveBalanceService {

    /** 면책: 출근율·결근 등 실제 근태에 따라 달라질 수 있음을 직원에게 명시. */
    static final String DISCLAIMER =
            "참고용 추정이에요. 실제 출근율·결근에 따라 실제 연차와 다를 수 있어요.";

    private final EmployeeProfileRepository employeeProfileRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final TimeOffRepository timeOffRepository;
    private final AnnualLeaveEntitlementResolver annualLeaveEntitlementResolver;

    /**
     * 본인(employeeId == User.id) 잔여 연차. 타인 ID 조회 불가 — 호출부에서 principal.getId() 만 넘긴다.
     */
    @Transactional(readOnly = true)
    public MyLeaveBalanceDto getMyLeaveBalance(Long employeeId) {
        Optional<EmployeeProfile> profile = employeeProfileRepository.findById(employeeId);
        List<EmployeeStoreRelation> active = relationRepository.findByEmployeeProfile_Id(employeeId).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()) && r.getStore() != null)
                .toList();

        List<TimeOff> approvedAnnual = profile
                .map(p -> timeOffRepository.findByEmployeeAndStatus(p, TimeOffStatus.APPROVED))
                .orElse(List.of())
                .stream()
                .filter(t -> t.getLeaveType() == TimeOffLeaveType.ANNUAL)
                .toList();

        LocalDate today = LocalDate.now();
        int entitled = 0;
        double used = 0.0;
        boolean fiveOrMoreApplicable = false;

        for (EmployeeStoreRelation r : active) {
            boolean fiveOrMore = isFiveOrMore(r.getStore());
            if (fiveOrMore) {
                fiveOrMoreApplicable = true;
            }
            entitled += entitledForRelation(r, today, fiveOrMore);
            used += usedForRelation(r, today, approvedAnnual);
        }

        double remaining = Math.max(entitled - used, 0.0);

        return new MyLeaveBalanceDto(entitled, used, remaining, fiveOrMoreApplicable, DISCLAIMER);
    }

    /** 해당 매장 활성 직원 수 기준 5인 이상 여부(연차 적용 대상, §11). */
    private boolean isFiveOrMore(Store store) {
        return relationRepository.countByStoreAndIsActiveTrue(store)
                >= LaborStandards.SMALL_BUSINESS_THRESHOLD;
    }

    /**
     * 매장별 발생 연차(추정, 출근율 100% 가정). {@link AnnualLeaveEntitlementResolver}(공통 산식)에 위임 —
     * §18③(주 15시간 미만 제외)·기간제 정확히 1년 계약 예외 포함. LaborAggregationService 와 동일 산식.
     */
    private int entitledForRelation(EmployeeStoreRelation r, LocalDate today, boolean fiveOrMore) {
        return annualLeaveEntitlementResolver.entitledDays(r, today, fiveOrMore);
    }

    /**
     * 매장별 승인된 연차(ANNUAL) 사용일수 — {@link TimeOff#computeConsumedDays}(공용 소비계산)로
     * {@link TimeOffService}의 승인 시 잔여 검증과 동일한 산식(반차 0.5일·시간단위 환산·소정근로일
     * 기준 종일 차감)을 쓴다. 현재 연차연도({@link AnnualLeaveEntitlementResolver#currentLeaveYearWindow})
     * 안에서 시작한 신청만 이번 주기 사용량으로 집계한다 — 그렇지 않으면 근속이 쌓일수록 과거
     * 연차연도 사용분까지 계속 차감돼 잔여가 부당하게 줄어든다.
     */
    private double usedForRelation(EmployeeStoreRelation r, LocalDate today, List<TimeOff> approvedAnnual) {
        Long storeId = r.getStore().getId();
        AnnualLeaveEntitlementResolver.LeaveYearWindow window =
                annualLeaveEntitlementResolver.currentLeaveYearWindow(r, today);
        Double dailyHours = annualLeaveEntitlementResolver.dailyContractedHoursOf(r);
        var scheduledWorkDays = annualLeaveEntitlementResolver.scheduledWorkDaysOf(r);

        return approvedAnnual.stream()
                .filter(t -> t.getStore() != null && storeId.equals(t.getStore().getId()))
                .filter(t -> window.contains(t.getStartDate()))
                .mapToDouble(t -> t.computeConsumedDays(dailyHours, scheduledWorkDays))
                .sum();
    }
}
