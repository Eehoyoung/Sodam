package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.repository.EmployeeProfileRepository;
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

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 구인 공고(JobPosting) API 역할/BOLA 테스트(260711_작업통합.md Part 2 §19.5).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobPostingControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;

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
        String biz = String.format("%010d", 4_440_000_000L + (bizSeq++));
        Store store = storeRepo.save(new Store("공고컨트롤러테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepo.save(store);

        MasterProfile masterProfile = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(masterProfile, store));
        return store;
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    private JobPostingUpsertRequest upsertRequest() {
        return new JobPostingUpsertRequest("REGULAR", "CAFE", null,
                LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", true);
    }

    @Test
    @DisplayName("직원 토큰으로 PUT /api/stores/{storeId}/job-posting → 403")
    void employeeToken_upsertPosting_forbidden() throws Exception {
        User emp = employee("emp_posting_ctrl1@x.com");
        User owner = master("owner_posting_ctrl1@x.com");
        Store store = ownedStore(owner);

        mockMvc.perform(put("/api/stores/{storeId}/job-posting", store.getId())
                        .with(asPrincipal(emp))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(upsertRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 토큰으로 타 매장 공고 수정 시도 → 403 (StoreAccessGuard)")
    void masterToken_otherStorePosting_forbidden() throws Exception {
        User owner = master("owner_posting_ctrl2@x.com");
        User otherOwner = master("owner_posting_ctrl3@x.com");
        Store otherStore = ownedStore(otherOwner);

        mockMvc.perform(put("/api/stores/{storeId}/job-posting", otherStore.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(upsertRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 매장 공고 upsert → 200")
    void masterToken_ownStorePosting_ok() throws Exception {
        User owner = master("owner_posting_ctrl4@x.com");
        Store store = ownedStore(owner);

        mockMvc.perform(put("/api/stores/{storeId}/job-posting", store.getId())
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(upsertRequest())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PERSONAL 등급으로 GET /api/job-postings/nearby → 403")
    void personalGrade_nearby_forbidden() throws Exception {
        User personal = new User("personal_posting_ctrl1@x.com", "일반회원");
        personal.setUserGrade(UserGrade.Personal);
        personal.setPassword("$2a$10$dummy");
        personal = userRepo.save(personal);

        mockMvc.perform(get("/api/job-postings/nearby").with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }
}
