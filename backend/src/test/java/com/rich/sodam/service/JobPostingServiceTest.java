package com.rich.sodam.service;

import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.JobPostingNearbyItemResponse;
import com.rich.sodam.dto.response.JobPostingResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 구인 공고(JobPosting) 서비스 테스트 — upsert 멱등·4km 경계·필터·희망지역 미설정
 * (260711_작업통합.md Part 2 §19.5).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobPostingServiceTest {

    @Autowired private JobPostingService service;
    @Autowired private JobPostingRepository jobPostingRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private JobSeekingProfileRepository jobSeekingProfileRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("posting_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User seekerUser() {
        User u = new User("posting_seeker" + (emailSeq++) + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner, String businessType) {
        String biz = String.format("%010d", 7_410_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("공고테스트매장", biz, "02-000-0000", businessType, 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        s = storeRepo.save(s);
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        return s;
    }

    private double latitudeFor(double storeLat, double targetMeters) {
        double deltaDegrees = Math.toDegrees(targetMeters / 6_371_000.0);
        return storeLat + deltaDegrees;
    }

    private void setDesiredLocations(User u, Store store, double distanceMeters) {
        JobSeekingProfile profile = new JobSeekingProfile(u);
        double lat = latitudeFor(store.getLatitude(), distanceMeters);
        double farLat = latitudeFor(store.getLatitude(), 50_000);
        profile.updateLocations("가까운지역", lat, store.getLongitude(), "먼지역", farLat, store.getLongitude());
        jobSeekingProfileRepo.save(profile);
    }

    private JobPostingUpsertRequest request(String workType, String category, boolean open) {
        java.time.LocalDate workDate = "SUBSTITUTE".equals(workType) ? java.time.LocalDate.now().plusDays(1) : null;
        return new JobPostingUpsertRequest(workType, category, workDate,
                LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", open);
    }

    private String errorCode(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    // ─────────────────────────────────────────────────────────────────
    // upsert — 최초 생성/멱등/타 매장(가드는 컨트롤러 담당, 여기선 로직만)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("최초 upsert → 신규 공고 생성")
    void upsertPosting_createsNew() {
        User owner = masterUser();
        Store store = store(owner, "카페");

        JobPostingResponse resp = service.upsertPosting(store.getId(), request("REGULAR", "CAFE", true));

        assertThat(resp.open()).isTrue();
        assertThat(resp.workType()).isEqualTo("REGULAR");
        assertThat(jobPostingRepo.findByStore_Id(store.getId())).isPresent();
    }

    @Test
    @DisplayName("upsert 멱등 — 두 번 호출해도 매장당 1건, 최신 내용으로 갱신")
    void upsertPosting_isIdempotent() {
        User owner = masterUser();
        Store store = store(owner, "카페");

        service.upsertPosting(store.getId(), request("REGULAR", "CAFE", true));
        JobPostingResponse second = service.upsertPosting(store.getId(), request("SUBSTITUTE", "BAKERY", false));

        assertThat(jobPostingRepo.findAll()).hasSize(1);
        assertThat(second.workType()).isEqualTo("SUBSTITUTE");
        assertThat(second.jobCategory()).isEqualTo("BAKERY");
        assertThat(second.open()).isFalse();
    }

    // ─────────────────────────────────────────────────────────────────
    // nearby — 4km 경계·필터·희망지역 미설정
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("4km 경계값: 3,999m/4,000m 포함, 4,001m 제외")
    void nearby_boundaryDistances() {
        User owner = masterUser();
        Store store = store(owner, "카페");
        service.upsertPosting(store.getId(), request("REGULAR", "CAFE", true));

        User seeker = seekerUser();
        setDesiredLocations(seeker, store, 4_000);

        List<JobPostingNearbyItemResponse> result = service.getNearbyPostings(seeker.getId(), null, null);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).distanceMeters()).isCloseTo(4_000L, org.assertj.core.data.Offset.offset(2L));
    }

    @Test
    @DisplayName("4km 초과 공고는 제외된다")
    void nearby_excludesBeyondRadius() {
        User owner = masterUser();
        Store store = store(owner, "카페");
        service.upsertPosting(store.getId(), request("REGULAR", "CAFE", true));

        User seeker = seekerUser();
        setDesiredLocations(seeker, store, 4_001);

        List<JobPostingNearbyItemResponse> result = service.getNearbyPostings(seeker.getId(), null, null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("희망지역 미설정 → JOB_SEEKING_LOCATIONS_REQUIRED 400")
    void nearby_withoutDesiredLocations_throws() {
        User seeker = seekerUser();
        // JobSeekingProfile 없음

        assertThatThrownBy(() -> service.getNearbyPostings(seeker.getId(), null, null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_LOCATIONS_REQUIRED"));
    }

    @Test
    @DisplayName("workType/category 필터 — 조건에 맞지 않는 공고는 제외")
    void nearby_filtersByWorkTypeAndCategory() {
        User owner1 = masterUser();
        Store store1 = store(owner1, "카페");
        service.upsertPosting(store1.getId(), request("REGULAR", "CAFE", true));

        User owner2 = masterUser();
        Store store2 = store(owner2, "베이커리");
        service.upsertPosting(store2.getId(), request("SUBSTITUTE", "BAKERY", true));

        User seeker = seekerUser();
        setDesiredLocations(seeker, store1, 500);
        // store2 도 seeker 희망지역 근처에 두기 위해 같은 좌표 사용
        store2.updateLocation(store1.getLatitude(), store1.getLongitude(), "서울 중구", 100);
        storeRepo.save(store2);

        List<JobPostingNearbyItemResponse> byType = service.getNearbyPostings(seeker.getId(), "REGULAR", null);
        assertThat(byType).extracting(JobPostingNearbyItemResponse::storeId).containsExactly(store1.getId());

        List<JobPostingNearbyItemResponse> byCategory = service.getNearbyPostings(seeker.getId(), null, "BAKERY");
        assertThat(byCategory).extracting(JobPostingNearbyItemResponse::storeId).containsExactly(store2.getId());
    }

    @Test
    @DisplayName("구인중 OFF 공고는 nearby 목록에서 제외된다")
    void nearby_excludesClosedPosting() {
        User owner = masterUser();
        Store store = store(owner, "카페");
        service.upsertPosting(store.getId(), request("REGULAR", "CAFE", false));

        User seeker = seekerUser();
        setDesiredLocations(seeker, store, 500);

        List<JobPostingNearbyItemResponse> result = service.getNearbyPostings(seeker.getId(), null, null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("공고 없는 매장의 GET → ENTITY_NOT_FOUND")
    void getMyPosting_withoutPosting_throwsNotFound() {
        User owner = masterUser();
        Store store = store(owner, "카페");

        assertThatThrownBy(() -> service.getMyPosting(store.getId()))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("ENTITY_NOT_FOUND"));
    }
}
