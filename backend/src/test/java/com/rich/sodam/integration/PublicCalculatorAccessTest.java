package com.rich.sodam.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WP-A — 공개 계산기가 <b>실제로</b> 비인증 접근 가능한지.
 *
 * <p>서비스 단위 테스트만으로는 부족하다. {@code SecurityConfig} 의 permitAll 등록이 빠지면
 * 계산은 맞는데 401 이 나서 유입 경로 자체가 죽는다 — 그 회귀를 여기서 막는다.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicCalculatorAccessTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("토큰 없이 주휴수당 계산기를 호출할 수 있다")
    void weeklyHolidayIsPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/public/calculators/weekly-holiday")
                        .param("weeklyHours", "20")
                        .param("hourlyWage", "10000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.disclaimer").isArray());
    }

    @Test
    @DisplayName("토큰 없이 최저임금·4대보험 계산기를 호출할 수 있다")
    void otherCalculatorsArePubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/public/calculators/minimum-wage").param("hourlyWage", "10030"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/calculators/social-insurance").param("monthlyWage", "3000000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").isNumber());
    }

    @Test
    @DisplayName("잘못된 입력은 400으로 거부한다 — 공개 API 라도 검증은 동일하다")
    void invalidInputIsRejected() throws Exception {
        mockMvc.perform(get("/api/public/calculators/social-insurance").param("monthlyWage", "0"))
                .andExpect(status().isBadRequest());
    }
}
