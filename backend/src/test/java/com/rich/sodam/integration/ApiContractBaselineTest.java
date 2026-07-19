package com.rich.sodam.integration;

import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WP-00. 계약 기준선 — {@code docs/260718/WP-00_계약_기준선_인벤토리.md} 에서 확정한
 * FE↔BE 불일치(FE_ONLY: BE 라우팅 자체가 없는 호출)를 실행 가능한 characterization test로 고정한다.
 *
 * <p>이 클래스는 제품 코드를 변경하지 않는다 — 현재 상태(라우팅 없음 → 404)를 잠그는 것이 목적이다.
 * 각 테스트가 다루는 FE 호출부와 후속 WP 번호는 테스트 이름과 주석에 명시했다. 어떤 항목이든
 * BE에 정식으로 구현되면(제품 판단 후) 해당 테스트의 기대값을 404 → 실제 상태 코드로 뒤집는다.</p>
 *
 * <p>모든 요청은 {@code .with(user(...))} 로 인증을 통과시킨 뒤 라우팅 결과만 본다 — 목적은
 * "이 경로에 매핑된 컨트롤러 메서드가 있는가"이지 인가 판단이 아니므로, 인증되지 않은 상태에서
 * 시큐리티 필터가 먼저 401/403을 반환해 라우팅 여부를 가리는 상황을 피한다.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class ApiContractBaselineTest {

    @Autowired
    MockMvc mockMvc;

    private static final UserPrincipal MASTER = new UserPrincipal(1L, "owner@sodam.dev", List.of(
            new SimpleGrantedAuthority("ROLE_MASTER")));

    @Nested
    @DisplayName("F-01 재확인: homeService.ts raw axios /api/v1/* — BE에 대응 컨트롤러가 없다")
    class HomeServiceV1Prefix {
        @Test
        @DisplayName("GET /api/v1/events → 404 (BE_ONLY 대응 경로는 /api/campaigns/active)")
        void v1Events_notFound() throws Exception {
            mockMvc.perform(get("/api/v1/events").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/v1/labor-info → 404 (정식 경로는 /api/labor-info, prefix만 다름)")
        void v1LaborInfo_notFound() throws Exception {
            mockMvc.perform(get("/api/v1/labor-info").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/v1/testimonials → 404 (G-1: BE에 대응 리소스 자체가 없음)")
        void v1Testimonials_notFound() throws Exception {
            mockMvc.perform(get("/api/v1/testimonials").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/v1/services → 404 (G-1: BE에 대응 리소스 자체가 없음)")
        void v1Services_notFound() throws Exception {
            mockMvc.perform(get("/api/v1/services").with(user(MASTER))).andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("attendanceService.ts 상세/통계/batch-status — AttendanceController에 매핑이 없다")
    class AttendanceDetailStatisticsGap {
        @Test
        @DisplayName("GET /api/attendance/{id} → 404")
        void getById_notFound() throws Exception {
            mockMvc.perform(get("/api/attendance/1").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("PUT /api/attendance/{id} → 404")
        void updateById_notFound() throws Exception {
            mockMvc.perform(put("/api/attendance/1").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("DELETE /api/attendance/{id} → 404")
        void deleteById_notFound() throws Exception {
            mockMvc.perform(delete("/api/attendance/1").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/attendance/statistics → 404")
        void statistics_notFound() throws Exception {
            mockMvc.perform(get("/api/attendance/statistics").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("PUT /api/attendance/batch-status → 404")
        void batchStatus_notFound() throws Exception {
            mockMvc.perform(put("/api/attendance/batch-status").with(user(MASTER))).andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("nfcAttendanceService.ts — 단수형 /nfc-tag, /nfc-settings 는 BE에 없다")
    class NfcPathGap {
        @Test
        @DisplayName("GET /api/stores/1/nfc-tag(단수) → 404 (BE는 복수형 /nfc-tags 만 존재)")
        void nfcTagSingular_notFound() throws Exception {
            mockMvc.perform(get("/api/stores/1/nfc-tag").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/stores/1/nfc-settings → 404")
        void nfcSettingsGet_notFound() throws Exception {
            mockMvc.perform(get("/api/stores/1/nfc-settings").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("PUT /api/stores/1/nfc-settings → 404")
        void nfcSettingsPut_notFound() throws Exception {
            mockMvc.perform(put("/api/stores/1/nfc-settings").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("대조: GET /api/stores/1/nfc-tags(복수, NfcTagController) 는 라우팅이 존재한다(404가 아니다)")
        void nfcTagsPlural_routed() throws Exception {
            mockMvc.perform(get("/api/stores/1/nfc-tags").with(user(MASTER)))
                    .andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }
    }

    @Nested
    @DisplayName("죽은 엔드포인트: 코드에 존재하지만 비활성화되었거나 BE 어디에도 없음")
    class DeadOrMissingEndpoints {
        @Test
        @DisplayName("POST /api/stores/change/master → 404 (StoreController.java에서 블록 주석으로 비활성화됨)")
        void changeMaster_notFound() throws Exception {
            mockMvc.perform(post("/api/stores/change/master").with(user(MASTER))).andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/salary/prediction → 404 (BE 어디에도 SalaryPrediction 관련 컨트롤러가 없음)")
        void salaryPrediction_notFound() throws Exception {
            mockMvc.perform(get("/api/salary/prediction").with(user(MASTER))).andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("정보 콘텐츠 4도메인 필터 서브경로 — tip-info/search/title 만 구현되어 있고 나머지는 없다")
    class InfoContentFilterGap {
        @Test
        @DisplayName("GET /api/tip-info/search/title → 존재 (대조군, 404 아님)")
        void tipInfoSearchTitle_routed() throws Exception {
            mockMvc.perform(get("/api/tip-info/search/title").param("keyword", "x").with(user(MASTER)))
                    .andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }

        @Test
        @DisplayName("GET /api/tax-info/search/title → 404 (TaxInfoController엔 search 계열이 없음)")
        void taxInfoSearchTitle_notFound() throws Exception {
            mockMvc.perform(get("/api/tax-info/search/title").param("keyword", "x").with(user(MASTER)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/policy-info/search/title → 404 (PolicyInfoController엔 search 계열이 없음)")
        void policyInfoSearchTitle_notFound() throws Exception {
            mockMvc.perform(get("/api/policy-info/search/title").param("keyword", "x").with(user(MASTER)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/labor-info/search/title → 404 (LaborInfoController엔 search 계열이 없음)")
        void laborInfoSearchTitle_notFound() throws Exception {
            mockMvc.perform(get("/api/labor-info/search/title").param("keyword", "x").with(user(MASTER)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("GET /api/tip-info/popular, /api/tip-info/difficulty → 404가 아니라 500 (전용 매핑이 없어 /{id} 로 흡수되어 'popular'를 Long id로 파싱 시도하다 실패)")
        void tipInfoPopularDifficulty_swallowedByIdMapping() throws Exception {
            // 실측(2026-07-19): 이 두 경로는 순수 라우팅 실패(404)가 아니라 더 나쁜 형태다 —
            // TipInfoController 에 전용 /popular, /difficulty 매핑이 없다 보니 GET /api/tip-info/{id}
            // 가 "popular"/"difficulty" 문자열을 그대로 id 로 흡수해 컨트롤러 메서드까지 도달한 뒤,
            // Long 파싱/조회 단계에서 터져 500 으로 응답한다. FE 입장에서는 404보다 더 혼란스러운
            // 실패(서버 오류로 보임)이므로 WP-03/G-1 제품 판단 시 우선순위를 높게 볼 근거로 삼는다.
            mockMvc.perform(get("/api/tip-info/popular").with(user(MASTER))).andExpect(status().is5xxServerError());
            mockMvc.perform(get("/api/tip-info/difficulty").param("difficulty", "EASY").with(user(MASTER)))
                    .andExpect(status().is5xxServerError());
        }
    }

    @Nested
    @DisplayName("§2 재확인: LoginController 의 prefix 없는 경로와 auth alias 는 실제로 라우팅된다(MATCH)")
    class AuthRoutingExists {
        @Test
        @DisplayName("POST /apple/auth/proc → 라우팅 존재(404 아님, 바디 누락으로 400 계열 가능)")
        void appleAuthProc_routed() throws Exception {
            mockMvc.perform(post("/apple/auth/proc").contentType("application/json").content("{}"))
                    .andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }

        @Test
        @DisplayName("GET /kakao/auth/proc → 라우팅 존재(404 아님)")
        void kakaoAuthProc_routed() throws Exception {
            mockMvc.perform(get("/kakao/auth/proc").param("code", "dummy"))
                    .andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }

        @Test
        @DisplayName("POST /api/auth/logout 과 POST /api/logout 둘 다 라우팅된다(배열 alias, G-2 정리 대상)")
        void logoutAliases_bothRouted() throws Exception {
            mockMvc.perform(post("/api/auth/logout").with(user(MASTER))).andExpect(status().is(org.hamcrest.Matchers.not(404)));
            mockMvc.perform(post("/api/logout").with(user(MASTER))).andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }

        @Test
        @DisplayName("GET /api/auth/me 와 GET /api/me 둘 다 라우팅된다(배열 alias, G-2 정리 대상)")
        void meAliases_bothRouted() throws Exception {
            mockMvc.perform(get("/api/auth/me").with(user(MASTER))).andExpect(status().is(org.hamcrest.Matchers.not(404)));
            mockMvc.perform(get("/api/me").with(user(MASTER))).andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }
    }

    @Nested
    @DisplayName("G-2: LegacyAttendanceProxyController — 삭제 금지 대상이지만 본인 확인 가드가 없다")
    class LegacyAttendanceProxy {
        @Test
        @DisplayName("POST /attendance/check-in (레거시, /api 없음) 은 여전히 라우팅된다 — 계측 없이는 삭제 금지(G-2)")
        void legacyCheckIn_stillRouted() throws Exception {
            mockMvc.perform(post("/attendance/check-in")
                            .contentType("application/json")
                            .content("{}")
                            .with(user(MASTER)))
                    .andExpect(status().is(org.hamcrest.Matchers.not(404)));
        }
    }
}
