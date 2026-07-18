package com.rich.sodam.controller;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.security.Key;
import java.util.Date;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 인증채용(구직) API 역할/BOLA 테스트(260711_작업통합.md Part 2 §8.2).
 *
 * <p>직원 토큰으로 사장 리스트 접근 403, 타 매장 조회 403(StoreAccessGuard), PERSONAL 등급 /me 접근 403,
 * 만료 토큰 401(403 아님 — FE 토큰갱신 전제, security.md) 를 고정한다.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobSeekerControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private JwtTokenProvider jwtTokenProvider;

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

    private User personal(String email) {
        User u = new User(email, "일반회원");
        u.setUserGrade(UserGrade.Personal);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private Store ownedStore(User owner) {
        String biz = String.format("%010d", 6_660_000_000L + (bizSeq++));
        Store store = storeRepo.save(new Store("컨트롤러테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepo.save(store);

        MasterProfile masterProfile = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(masterProfile, store));
        return store;
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    @Test
    @DisplayName("직원 토큰으로 GET /api/stores/{storeId}/job-seekers → 403")
    void employeeToken_storeJobSeekers_forbidden() throws Exception {
        User emp = employee("emp_ctrl1@x.com");
        User owner = master("owner_ctrl1@x.com");
        Store store = ownedStore(owner);

        mockMvc.perform(get("/api/stores/{storeId}/job-seekers", store.getId())
                        .with(asPrincipal(emp)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 토큰으로 타인 매장 리스트 조회 → 403 (StoreAccessGuard)")
    void masterToken_otherStoreJobSeekers_forbidden() throws Exception {
        User owner = master("owner_ctrl2@x.com");
        User otherOwner = master("owner_ctrl3@x.com");
        Store otherStore = ownedStore(otherOwner);

        mockMvc.perform(get("/api/stores/{storeId}/job-seekers", otherStore.getId())
                        .with(asPrincipal(owner)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PERSONAL 등급으로 GET /api/job-seekers/me → 403 (EmployeeOrMaster)")
    void personalGrade_getMyProfile_forbidden() throws Exception {
        User personal = personal("personal_ctrl1@x.com");

        mockMvc.perform(get("/api/job-seekers/me").with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PERSONAL 등급으로 GET /api/stores/{storeId}/job-seekers → 403 (MasterOnly)")
    void personalGrade_storeJobSeekers_forbidden() throws Exception {
        User personal = personal("personal_ctrl2@x.com");
        User owner = master("owner_ctrl5@x.com");
        Store store = ownedStore(owner);

        mockMvc.perform(get("/api/stores/{storeId}/job-seekers", store.getId())
                        .with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("만료 토큰 → 401 (403 아님 — FE 토큰갱신 전제)")
    void expiredToken_returnsUnauthorized() throws Exception {
        Key key = (Key) ReflectionTestUtils.getField(jwtTokenProvider, "key");
        String expiredToken = Jwts.builder()
                .subject("expired_ctrl@x.com")
                .claim("id", 1L)
                .claim("email", "expired_ctrl@x.com")
                .issuedAt(new Date(System.currentTimeMillis() - 20_000))
                .expiration(new Date(System.currentTimeMillis() - 10_000))
                .signWith(key)
                .compact();

        mockMvc.perform(get("/api/job-seekers/me")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("사장 본인 매장 조회 → 200 (정상 경로)")
    void masterToken_ownStoreJobSeekers_ok() throws Exception {
        User owner = master("owner_ctrl4@x.com");
        Store store = ownedStore(owner);

        mockMvc.perform(get("/api/stores/{storeId}/job-seekers", store.getId())
                        .with(asPrincipal(owner)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("직원 본인 GET /me → 200, 프로필 없으면 기본값(구직 OFF) 응답")
    void employeeToken_getMyProfile_ok() throws Exception {
        User emp = employee("emp_ctrl4@x.com");

        mockMvc.perform(get("/api/job-seekers/me").with(asPrincipal(emp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seeking").value(false))
                .andExpect(jsonPath("$.eligible").value(false));
    }
}
