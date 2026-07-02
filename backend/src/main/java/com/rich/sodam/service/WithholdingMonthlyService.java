package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.VatDeadlineResponse;
import com.rich.sodam.dto.response.WithholdingMonthlyResponse;
import com.rich.sodam.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 원천세 월 신고 요약 + 부가세 분기 기한 알림 (B6/T-NEW-04·06).
 *
 * <p>사장이 매월 10일 원천세, 분기 부가세 신고를 놓치지 않도록 <b>요약·기한 안내</b>만 한다.
 * 신고·납부는 홈택스 위임(대행 아님). 기한·D-day 계산은 기준일을 받는 package-private 헬퍼로 분리해
 * 시각 의존 없이 단위 테스트(테스트 룰: 시각 고정)할 수 있게 했다.
 */
@Service
@RequiredArgsConstructor
public class WithholdingMonthlyService {

    /** 원천세 신고·납부 기한 = 귀속 월 익월 10일(소득세법 원천징수 일반). */
    static final int WITHHOLDING_DUE_DAY = 10;

    /** 부가세 일반과세 분기 신고기한 = 1·4·7·10월 25일(직전 과세기간분). */
    static final int VAT_DUE_DAY = 25;

    static final String WITHHOLDING_DISCLAIMER =
            "참고용 요약이에요. 실제 원천세 신고·납부액은 세무사 검토 후 홈택스에서 확정해 주세요.";

    static final String VAT_DISCLAIMER =
            "참고용 기한 안내예요. 신고세액은 매출·매입에 따라 달라지니 홈택스·세무사 검토가 필요해요.";

    static final String VAT_GUIDANCE =
            "일반과세 기준 분기 기한이에요. 간이과세자는 보통 연 1회(다음 해 1월 25일) 신고하니 본인 과세유형을 확인해 주세요.";

    private final PayrollRepository payrollRepository;

    /**
     * 해당 월 원천세 요약: 그 달 급여 원천징수세액 합 + 익월 10일 기한 + D-day.
     */
    @Transactional(readOnly = true)
    public WithholdingMonthlyResponse monthlySummary(Long storeId, int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("월은 1~12 사이여야 해요: " + month);
        }
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        List<Payroll> rows = payrollRepository.findByStoreIdAndPeriod(storeId, from, to);

        long totalWithheld = 0;
        for (Payroll p : rows) {
            if (p.getTaxAmount() != null) {
                totalWithheld += p.getTaxAmount();
            }
        }

        return buildMonthlySummary(storeId, year, month, totalWithheld, LocalDate.now());
    }

    /**
     * 다가오는 부가세 분기 신고기한 안내(금액 없이 기한·D-day만).
     */
    @Transactional(readOnly = true)
    public VatDeadlineResponse upcomingVatDeadline(Long storeId) {
        return buildVatDeadline(storeId, LocalDate.now());
    }

    // ── 기준일을 받는 순수 계산부(테스트에서 시각 고정) ──

    WithholdingMonthlyResponse buildMonthlySummary(
            Long storeId, int year, int month, long totalWithheld, LocalDate today) {
        LocalDate dueDate = LocalDate.of(year, month, 1).plusMonths(1).withDayOfMonth(WITHHOLDING_DUE_DAY);
        long daysUntilDue = ChronoUnit.DAYS.between(today, dueDate);
        return new WithholdingMonthlyResponse(
                storeId, year, month, totalWithheld, dueDate, daysUntilDue, WITHHOLDING_DISCLAIMER);
    }

    VatDeadlineResponse buildVatDeadline(Long storeId, LocalDate today) {
        LocalDate dueDate = nextVatDueDate(today);
        long daysUntilDue = ChronoUnit.DAYS.between(today, dueDate);
        return new VatDeadlineResponse(
                storeId, describeQuarter(dueDate), dueDate, daysUntilDue, VAT_GUIDANCE, VAT_DISCLAIMER);
    }

    /** 오늘(이후) 기준 가장 가까운 일반과세 분기 신고기한(1·4·7·10월 25일). */
    LocalDate nextVatDueDate(LocalDate today) {
        for (int filingMonth : new int[]{1, 4, 7, 10}) {
            LocalDate candidate = LocalDate.of(today.getYear(), filingMonth, VAT_DUE_DAY);
            if (!candidate.isBefore(today)) {
                return candidate;
            }
        }
        // 올해 10월 25일도 지났으면 내년 1기 신고(다음 해 1월 25일).
        return LocalDate.of(today.getYear() + 1, 1, VAT_DUE_DAY);
    }

    /** 신고기한 → 직전 과세기간 라벨(일반과세 반기 기준). */
    private String describeQuarter(LocalDate dueDate) {
        return switch (dueDate.getMonthValue()) {
            case 1 -> (dueDate.getYear() - 1) + "년 2기 확정";
            case 4 -> dueDate.getYear() + "년 1기 예정";
            case 7 -> dueDate.getYear() + "년 1기 확정";
            case 10 -> dueDate.getYear() + "년 2기 예정";
            default -> dueDate.getYear() + "년 분기";
        };
    }
}
