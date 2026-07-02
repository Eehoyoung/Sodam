package com.rich.sodam.service;

import com.rich.sodam.dto.response.CampaignResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 시즌 캠페인 (T-NEW-07) — 월별 노출 판정.
 */
class CampaignServiceTest {

    private final CampaignService service = new CampaignService();

    @Test
    @DisplayName("5월 → 종소세 캠페인 노출")
    void may() {
        List<CampaignResponse> active = service.activeCampaigns(LocalDate.of(2026, 5, 10));
        assertThat(active).extracting(CampaignResponse::key).contains("INCOME_TAX_RETURN");
    }

    @Test
    @DisplayName("1·7월 → 부가세 캠페인 노출")
    void vatMonths() {
        assertThat(service.activeCampaigns(LocalDate.of(2026, 1, 5)))
                .extracting(CampaignResponse::key).contains("VAT_RETURN");
        assertThat(service.activeCampaigns(LocalDate.of(2026, 7, 5)))
                .extracting(CampaignResponse::key).contains("VAT_RETURN");
    }

    @Test
    @DisplayName("비시즌(3월) → 캠페인 없음")
    void offSeason() {
        assertThat(service.activeCampaigns(LocalDate.of(2026, 3, 10))).isEmpty();
    }
}
