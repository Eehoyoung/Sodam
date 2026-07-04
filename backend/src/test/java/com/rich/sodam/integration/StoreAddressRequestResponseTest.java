package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StoreAddressRequestResponseTest {

    private static final String ADDRESS = "경기 고양시 일산동구 고봉로 422";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private MasterProfileRepository masterProfileRepository;

    @Autowired
    private MasterStoreRelationRepository masterStoreRelationRepository;

    @Test
    @DisplayName("POST /api/stores/registration address query geocodes and returns coordinates")
    void registerStoreWithAddressQuery_returnsCoordinates() throws Exception {
        User master = createMaster("address_register_master@example.com");
        String unique = String.valueOf(System.nanoTime());

        Map<String, Object> request = new HashMap<>();
        request.put("storeName", "Address Test Store");
        request.put("businessNumber", unique.substring(Math.max(0, unique.length() - 10)));
        request.put("storePhoneNumber", "02-1234-5678");
        request.put("businessType", "FOOD");
        request.put("businessLicenseNumber", "BL-" + unique);
        request.put("query", ADDRESS);
        request.put("radius", 120);
        request.put("storeStandardHourWage", 12000);

        mockMvc.perform(post("/api/stores/registration")
                        .with(asPrincipal(master))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullAddress").value(ADDRESS))
                .andExpect(jsonPath("$.roadAddress").value(ADDRESS))
                .andExpect(jsonPath("$.jibunAddress").value(ADDRESS))
                .andExpect(jsonPath("$.latitude").isNumber())
                .andExpect(jsonPath("$.longitude").isNumber())
                .andExpect(jsonPath("$.radius").value(120));
    }

    @Test
    @DisplayName("PUT /api/stores/{storeId}/location address geocodes, stores, and returns coordinates")
    void updateStoreLocationWithAddress_returnsCoordinates() throws Exception {
        User master = createMaster("address_location_master@example.com");
        Store store = createOwnedStore(master);

        Map<String, Object> request = new HashMap<>();
        request.put("fullAddress", ADDRESS);
        request.put("radius", 150);

        mockMvc.perform(put("/api/stores/{storeId}/location", store.getId())
                        .with(asPrincipal(master))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(store.getId()))
                .andExpect(jsonPath("$.fullAddress").value(ADDRESS))
                .andExpect(jsonPath("$.latitude").isNumber())
                .andExpect(jsonPath("$.longitude").isNumber())
                .andExpect(jsonPath("$.radius").value(150));

        Store reloaded = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(reloaded.getFullAddress()).isEqualTo(ADDRESS);
        assertThat(reloaded.getLatitude()).isNotNull();
        assertThat(reloaded.getLongitude()).isNotNull();
        assertThat(reloaded.getRadius()).isEqualTo(150);
    }

    private User createMaster(String email) {
        User master = new User(email, "Master");
        master.setUserGrade(UserGrade.MASTER);
        master.setPassword("$2a$10$dummy");
        return userRepository.save(master);
    }

    private Store createOwnedStore(User master) {
        String unique = String.valueOf(System.nanoTime());
        Store store = new Store(
                "Owned Address Test Store",
                unique.substring(Math.max(0, unique.length() - 10)),
                "02-9876-5432",
                "FOOD",
                12000,
                100
        );
        store.updateLocation(37.1, 127.1, "Old Address", 100);
        store = storeRepository.save(store);

        MasterProfile masterProfile = masterProfileRepository.save(new MasterProfile(master));
        masterStoreRelationRepository.save(new MasterStoreRelation(masterProfile, store));
        return store;
    }

    private RequestPostProcessor asPrincipal(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        return SecurityMockMvcRequestPostProcessors.user(principal);
    }
}
