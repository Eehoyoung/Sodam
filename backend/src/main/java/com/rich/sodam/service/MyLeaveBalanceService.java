package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.core.payroll.leave.AnnualLeaveCalculator;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.dto.response.MyLeaveBalanceDto;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * 직원 본인용 잔여 연차 조회 (E-NEW-03). 읽기 전용·추정.
 *
 * <p>발생 연차({@link AnnualLeaveCalculator}, 출근율 100% 가정) − 승인된 휴가 사용일수 = 잔여.
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
    private final AnnualLeaveCalculator annualLeaveCalculator;

    /**
     * 본인(employeeId == User.id) 잔여 연차. 타인 ID 조회 불가 — 호출부에서 principal.getId() 만 넘긴다.
     */
    @Transactional(readOnly = true)
    public MyLeaveBalanceDto getMyLeaveBalance(Long employeeId) {
        Optional<EmployeeProfile> profile = employeeProfileRepository.findById(employeeId);
        List<EmployeeStoreRelation> active = relationRepository.findByEmployeeProfile_Id(employeeId).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()) && r.getStore() != null)
                .toList();

        LocalDate today = LocalDate.now();
        int entitled = 0;
        boolean fiveOrMoreApplicable = false;

        for (EmployeeStoreRelation r : active) {
            boolean fiveOrMore = isFiveOrMore(r.getStore());
            if (fiveOrMore) {
                fiveOrMoreApplicable = true;
            }
            entitled += entitledForRelation(r, today, fiveOrMore);
        }

        int used = profile.map(this::approvedUsedDays).orElse(0);
        int remaining = Math.max(entitled - used, 0);

        return new MyLeaveBalanceDto(entitled, used, remaining, fiveOrMoreApplicable, DISCLAIMER);
    }

    /** 해당 매장 활성 직원 수 기준 5인 이상 여부(연차 적용 대상, §11). */
    private boolean isFiveOrMore(Store store) {
        return relationRepository.findByStoreAndIsActiveTrue(store).size()
                >= LaborStandards.SMALL_BUSINESS_THRESHOLD;
    }

    /** 매장별 발생 연차(추정, 출근율 100% 가정). LaborAggregationService 와 동일 산식. */
    private int entitledForRelation(EmployeeStoreRelation r, LocalDate today, boolean fiveOrMore) {
        LocalDate hire = r.getHireDate() == null ? today : r.getHireDate();
        long tenureDays = ChronoUnit.DAYS.between(hire, today);
        int completedYears = (int) (tenureDays / 365);
        int monthsWorked = (int) ChronoUnit.MONTHS.between(hire, today);

        return completedYears >= 1
                ? annualLeaveCalculator.annual(completedYears, 1.0, fiveOrMore)
                : annualLeaveCalculator.firstYearMonthly(monthsWorked, fiveOrMore);
    }

    /** 승인된 휴가의 사용일수 합산(시작~종료 양끝 포함). */
    private int approvedUsedDays(EmployeeProfile profile) {
        return timeOffRepository.findByEmployeeAndStatus(profile, TimeOffStatus.APPROVED).stream()
                .mapToInt(MyLeaveBalanceService::inclusiveDays)
                .sum();
    }

    private static int inclusiveDays(TimeOff t) {
        if (t.getStartDate() == null || t.getEndDate() == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(t.getStartDate(), t.getEndDate()) + 1;
        return days < 0 ? 0 : (int) days;
    }
}
