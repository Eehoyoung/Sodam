package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "sodam.integration.kakao.mode=live")
@Transactional
@EnabledIfEnvironmentVariable(named = "SODAM_INTEGRATION_KAKAO_LIVE_TEST", matches = "true")
class StoreAddressLiveRequestResponseTest {

    private static final String ROAD_ADDRESS = envOrDefault(
            "SODAM_TEST_ROAD_ADDRESS",
            "\uACBD\uAE30 \uACE0\uC591\uC2DC \uC77C\uC0B0\uB3D9\uAD6C \uACE0\uBD09\uB85C 422"
    );
    private static final String JIBUN_ADDRESS = envOrDefault(
            "SODAM_TEST_JIBUN_ADDRESS",
            "\uACBD\uAE30 \uACE0\uC591\uC2DC \uC77C\uC0B0\uB3D9\uAD6C \uC911\uC0B0\uB3D9 1556"
    );
    private static final double EXPECTED_LATITUDE = Double.parseDouble(
            envOrDefault("SODAM_TEST_EXPECTED_LATITUDE", "37.696110716032")
    );
    private static final double EXPECTED_LONGITUDE = Double.parseDouble(
            envOrDefault("SODAM_TEST_EXPECTED_LONGITUDE", "126.780003954084")
    );

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("POST /api/stores/registration uses live Kakao geocoding for address query")
    void registerStoreWithLiveKakaoGeocoding() throws Exception {
        User master = createMaster("live_address_master@example.com");
        String unique = String.valueOf(System.nanoTime());

        Map<String, Object> request = new HashMap<>();
        request.put("storeName", "Live Address Test Store");
        request.put("businessNumber", unique.substring(Math.max(0, unique.length() - 10)));
        request.put("storePhoneNumber", "02-1234-5678");
        request.put("businessType", "FOOD");
        request.put("businessLicenseNumber", "BL-" + unique);
        request.put("query", ROAD_ADDRESS);
        request.put("radius", 120);
        request.put("storeStandardHourWage", 12000);

        MvcResult result = mockMvc.perform(post("/api/stores/registration")
                        .with(asPrincipal(master))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullAddress").value(ROAD_ADDRESS))
                .andExpect(jsonPath("$.roadAddress").value(ROAD_ADDRESS))
                .andExpect(jsonPath("$.jibunAddress").value(JIBUN_ADDRESS))
                .andExpect(jsonPath("$.latitude").isNumber())
                .andExpect(jsonPath("$.longitude").isNumber())
                .andExpect(jsonPath("$.radius").value(120))
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.get("latitude").asDouble()).isCloseTo(EXPECTED_LATITUDE, org.assertj.core.data.Offset.offset(0.000001));
        assertThat(response.get("longitude").asDouble()).isCloseTo(EXPECTED_LONGITUDE, org.assertj.core.data.Offset.offset(0.000001));

        System.out.println("LIVE_STORE_REGISTRATION_REQUEST=" + objectMapper.writeValueAsString(request));
        System.out.println("LIVE_STORE_REGISTRATION_RESPONSE=" + result.getResponse().getContentAsString());
    }

    private User createMaster(String email) {
        User master = new User(email, "Master");
        master.setUserGrade(UserGrade.MASTER);
        master.setPassword("$2a$10$dummy");
        return userRepository.save(master);
    }

    private RequestPostProcessor asPrincipal(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        return SecurityMockMvcRequestPostProcessors.user(principal);
    }

    private static String envOrDefault(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
