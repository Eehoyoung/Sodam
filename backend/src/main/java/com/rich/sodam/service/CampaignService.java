package com.rich.sodam.service;

import com.rich.sodam.dto.response.CampaignResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 인앱 시즌 캠페인 (T-NEW-07). 시기별 세무 안내 배너를 내려준다(읽기 전용).
 *
 * <p>종소세(5월)·부가세(1·7월) 등 신고 시즌에 맞춰 노출. 매출 인식/결제와 무관한 안내.
 */
@Service
public class CampaignService {

    public List<CampaignResponse> activeCampaigns(LocalDate today) {
        List<CampaignResponse> active = new ArrayList<>();
        int month = today.getMonthValue();

        if (month == 5) {
            active.add(new CampaignResponse(
                    "INCOME_TAX_RETURN",
                    "종합소득세 신고의 달",
                    "5월은 종합소득세 신고 기간이에요. 3.3% 떼인 세금, 환급받을 수 있는지 확인해 보세요.",
                    "sodam://tax"));
        }
        if (month == 1 || month == 7) {
            active.add(new CampaignResponse(
                    "VAT_RETURN",
                    "부가가치세 신고 기간",
                    "이번 달은 부가세 신고 기간이에요. 기한(25일)을 놓치지 마세요.",
                    "sodam://tax"));
        }
        return active;
    }
}
