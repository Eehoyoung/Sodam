package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobApplicationRespondRequest;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.JobPostingService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 구인 공고 지원(JobApplication) API 역할/BOLA 테스트(260711_작업통합.md Part 2 §19.5).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobApplicationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private JobPostingService jobPostingService;

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
        String biz = String.format("%010d", 3_330_000_000L + (bizSeq++));
        Store store = storeRepo.save(new Store("지원컨트롤러테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepo.save(store);

        MasterProfile masterProfile = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(masterProfile, store));
        return store;
    }

    private void openPosting(Store store) {
        jobPostingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", true));
    }

    private void grantEligibility(User u, Store store) {
        // employee(email) 헬퍼가 이미 EmployeeProfile 을 생성해두므로 재생성하지 않고 조회한다
        // (동일 PK 로 새 인스턴스를 save 하면 영속성 컨텍스트 충돌로 DuplicateKeyException 발생).
        EmployeeProfile emp = employeeProfileRepo.findById(u.getId()).orElseGet(() -> employeeProfileRepo.save(new EmployeeProfile(u)));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    @Test
    @DisplayName("직원 지원 → 201, storeCode 미포함")
    void employee_apply_created() throws Exception {
        User owner = master("owner_app_ctrl1@x.com");
        Store store = ownedStore(owner);
        openPosting(store);
        User applicant = employee("applicant_app_ctrl1@x.com");
        grantEligibility(applicant, store);

        String postingResponse = mockMvc.perform(get("/api/stores/{storeId}/job-posting", store.getId())
                        .with(asPrincipal(owner)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long postingId = objectMapper.readTree(postingResponse).get("id").asLong();

        mockMvc.perform(post("/api/job-postings/{postingId}/applications", postingId)
                        .with(asPrincipal(applicant))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.storeCode").doesNotExist());
    }

    @Test
    @DisplayName("사장 토큰으로 타 매장 명의 지원자 응답 시도 → 403 (StoreAccessGuard 대응 검증)")
    void masterToken_otherStoreRespond_forbidden() throws Exception {
        User owner = master("owner_app_ctrl2@x.com");
        Store store = ownedStore(owner);
        openPosting(store);
        User applicant = employee("applicant_app_ctrl2@x.com");
        grantEligibility(applicant, store);

        String postingIdNode = mockMvc.perform(get("/api/stores/{storeId}/job-posting", store.getId())
                        .with(asPrincipal(owner)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long postingId = objectMapper.readTree(postingIdNode).get("id").asLong();

        String applyResponse = mockMvc.perform(post("/api/job-postings/{postingId}/applications", postingId)
                        .with(asPrincipal(applicant))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long applicationId = objectMapper.readTree(applyResponse).get("id").asLong();

        User otherOwner = master("owner_app_ctrl3@x.com");
        ownedStore(otherOwner);

        mockMvc.perform(put("/api/job-applications/{id}/respond", applicationId)
                        .with(asPrincipal(otherOwner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new JobApplicationRespondRequest(true))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 매장 지원자 응답(수락) → 200")
    void masterToken_ownStoreRespond_ok() throws Exception {
        User owner = master("owner_app_ctrl4@x.com");
        Store store = ownedStore(owner);
        openPosting(store);
        User applicant = employee("applicant_app_ctrl4@x.com");
        grantEligibility(applicant, store);

        String postingResponse = mockMvc.perform(get("/api/stores/{storeId}/job-posting", store.getId())
                        .with(asPrincipal(owner)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long postingId = objectMapper.readTree(postingResponse).get("id").asLong();

        String applyResponse = mockMvc.perform(post("/api/job-postings/{postingId}/applications", postingId)
                        .with(asPrincipal(applicant))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long applicationId = objectMapper.readTree(applyResponse).get("id").asLong();

        mockMvc.perform(put("/api/job-applications/{id}/respond", applicationId)
                        .with(asPrincipal(owner))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new JobApplicationRespondRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    @DisplayName("PERSONAL 등급으로 GET /api/job-applications/me → 403")
    void personalGrade_myApplications_forbidden() throws Exception {
        User personal = new User("personal_app_ctrl1@x.com", "일반회원");
        personal.setUserGrade(UserGrade.Personal);
        personal.setPassword("$2a$10$dummy");
        personal = userRepo.save(personal);

        mockMvc.perform(get("/api/job-applications/me").with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }
}
