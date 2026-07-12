package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobOfferCreateRequest;
import com.rich.sodam.dto.request.JobOfferRespondRequest;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 채용 제안(JobOffer) API 역할/BOLA 테스트(260711_작업통합.md Part 2 §15.6).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobOfferControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private JobSeekingProfileRepository jobSeekingProfileRepo;

    private int bizSeq = 0;

    private User master(String email) {
        User u = new User(email, "사장");
        u.setUserGrade(UserGrade.MASTER);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private User employee(String email) {
        User u = new User(email, "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        u.setPassword("$2a$10$dummy");
        u = userRepo.save(u);
        employeeProfileRepo.save(new EmployeeProfile(u));
        return u;
    }

    private Store ownedStore(User owner) {
        String biz = String.format("%010d", 5_550_000_000L + (bizSeq++));
        Store store = storeRepo.save(new Store("제안컨트롤러테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepo.save(store);

        MasterProfile masterProfile = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(masterProfile, store));
        return store;
    }

    private void seeking(User u, List<String> types) {
        JobSeekingProfile profile = new JobSeekingProfile(u);
        profile.updateSeekingTypes(types);
        profile.turnOn();
        jobSeekingProfileRepo.save(profile);
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    private JobOfferCreateRequest regularRequest(Long targetUserId) {
        return new JobOfferCreateRequest(targetUserId, "REGULAR", null,
                LocalTime.of(10, 0), LocalTime.of(18, 0), 12_000, "정기 제안");
    }

    @Test
    @DisplayName("직원 토큰으로 POST /api/stores/{storeId}/job-offers → 403")
    void employeeToken_sendOffer_forbidden() throws Exception {
        User emp = employee("emp_offer_ctrl1@x.com");
        User owner = master("owner_offer_ctrl1@x.com");
        Store store = ownedStore(owner);
        User target = employee("target_offer_ctrl1@x.com");
        seeking(target, List.of("REGULAR"));

        mockMvc.perform(post("/api/stores/{storeId}/job-offers", store.getId())
                        .with(asPrincipal(emp))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(regularRequest(target.getId()))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 토큰으로 타인 매장 명의 발송 → 403 (StoreAccessGuard)")
    void masterToken_otherStoreSendOffer_forbidden() throws Exception {
        User owner = master("owner_offer_ctrl2@x.com");
        User otherOwner = master("owner_offer_ctrl3@x.com");
        Store otherStore = ownedStore(otherOwner);
        User target = employee("target_offer_ctrl2@x.com");
        seeking(target, List.of("REGULAR"));

        mockMvc.perform(post("/api/stores/{storeId}/job-offers", otherStore.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(regularRequest(target.getId()))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 매장 발송 → 201")
    void masterToken_ownStoreSendOffer_created() throws Exception {
        User owner = master("owner_offer_ctrl4@x.com");
        Store store = ownedStore(owner);
        User target = employee("target_offer_ctrl4@x.com");
        seeking(target, List.of("REGULAR"));

        mockMvc.perform(post("/api/stores/{storeId}/job-offers", store.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(regularRequest(target.getId()))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.storeCode").doesNotExist());
    }

    @Test
    @DisplayName("PERSONAL 등급으로 GET /api/job-offers/me → 403 (EmployeeOrMaster)")
    void personalGrade_getMyOffers_forbidden() throws Exception {
        User personal = new User("personal_offer_ctrl1@x.com", "일반회원");
        personal.setUserGrade(UserGrade.Personal);
        personal.setPassword("$2a$10$dummy");
        personal = userRepo.save(personal);

        mockMvc.perform(get("/api/job-offers/me").with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("수신자가 아닌 직원이 응답 시도 → 403")
    void nonRecipient_respond_forbidden() throws Exception {
        User owner = master("owner_offer_ctrl5@x.com");
        Store store = ownedStore(owner);
        User target = employee("target_offer_ctrl5@x.com");
        User stranger = employee("stranger_offer_ctrl5@x.com");
        seeking(target, List.of("REGULAR"));

        String createResponse = mockMvc.perform(post("/api/stores/{storeId}/job-offers", store.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(regularRequest(target.getId()))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long offerId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(put("/api/job-offers/{offerId}/respond", offerId)
                        .with(asPrincipal(stranger))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new JobOfferRespondRequest(true))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("수신자 본인 수락 응답 → 200, storeCode 포함")
    void recipient_accept_ok_includesStoreCode() throws Exception {
        User owner = master("owner_offer_ctrl6@x.com");
        Store store = ownedStore(owner);
        User target = employee("target_offer_ctrl6@x.com");
        seeking(target, List.of("REGULAR"));

        String createResponse = mockMvc.perform(post("/api/stores/{storeId}/job-offers", store.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(regularRequest(target.getId()))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long offerId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(put("/api/job-offers/{offerId}/respond", offerId)
                        .with(asPrincipal(target))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new JobOfferRespondRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.storeCode").value(store.getStoreCode()));
    }
}
