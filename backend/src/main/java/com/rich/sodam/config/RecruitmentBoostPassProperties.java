package com.rich.sodam.config;

import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * 채용 부스트 무제한 패스 수치 설정(recruitment-monetization-gamification-plan.md §2.5).
 *
 * <p>기간(일수)·가격은 하드코딩하지 않고 전부 이 설정값을 거친다 — 가격이 계획서 §10에서
 * "추정치"로 명시된 미확정 항목이므로 코드 변경 없이 {@code application.yml}/env override 만으로
 * 조정 가능해야 한다({@code AttendanceCreditProperties.Charge}와 동일 원칙).
 * {@code sodam.recruitment-boost-pass.*} 트리에서 매핑된다.</p>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.recruitment-boost-pass")
public class RecruitmentBoostPassProperties {

    /** 3일권 — 기간(일). */
    private int threeDayDurationDays = 3;
    /** 3일권 — 가격(원). */
    private int threeDayPriceKrw = 9_900;

    /** 7일권 — 기간(일). */
    private int sevenDayDurationDays = 7;
    /** 7일권 — 가격(원). */
    private int sevenDayPriceKrw = 17_900;

    /** 30일권 — 기간(일). */
    private int thirtyDayDurationDays = 30;
    /** 30일권 — 가격(원). */
    private int thirtyDayPriceKrw = 49_900;

    /** 상품코드 → (기간, 가격) 조회. */
    public ProductQuote quote(RecruitmentBoostPassProductCode code) {
        return switch (code) {
            case THREE_DAY -> new ProductQuote(code, threeDayDurationDays, threeDayPriceKrw);
            case SEVEN_DAY -> new ProductQuote(code, sevenDayDurationDays, sevenDayPriceKrw);
            case THIRTY_DAY -> new ProductQuote(code, thirtyDayDurationDays, thirtyDayPriceKrw);
        };
    }

    public List<ProductQuote> allQuotes() {
        return Arrays.stream(RecruitmentBoostPassProductCode.values()).map(this::quote).toList();
    }

    /** 상품 1건의 현재 판매 조건(기간/가격) — 설정값에서 즉시 조회한 스냅샷. */
    public record ProductQuote(RecruitmentBoostPassProductCode code, int durationDays, int priceKrw) {
    }
}
