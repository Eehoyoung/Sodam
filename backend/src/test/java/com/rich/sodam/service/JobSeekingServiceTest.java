package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.JobAvailabilityDay;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobSeekingUpdateRequest;
import com.rich.sodam.dto.response.JobSeekerListItemResponse;
import com.rich.sodam.dto.response.JobSeekingProfileResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.util.GeoUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 인증채용(구직) 서비스 테스트 — 자격 검증·부분 업데이트·4km 매칭·업종/유형/날짜 필터
 * (260711_작업통합.md Part 2 §8.1).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobSeekingServiceTest {

    @Autowired private JobSeekingService service;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private EmployeeStoreRelationRepository relationRepo;
    @Autowired private JobSeekingProfileRepository jobSeekingProfileRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    // ─────────────────────────────────────────────────────────────────
    // 픽스처 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private User user() {
        User u = new User("jobseeker" + (emailSeq++) + "@x.com", "구직자");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private EmployeeProfile employeeProfile(User u) {
        return employeeProfileRepo.save(new EmployeeProfile(u));
    }

    private Store store(String businessType) {
        String biz = String.format("%010d", 7770000000L + (bizSeq++));
        Store s = storeRepo.save(new Store("테스트매장", biz, "02-000-0000", businessType, 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        return storeRepo.save(s);
    }

    private void grantEligibility(EmployeeProfile emp, Store store) {
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private JobSeekingUpdateRequest fullOnRequest() {
        return new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE", "REGULAR"),
                List.of("CAFE", "BAKERY"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));
    }

    private String errorCode(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    // ─────────────────────────────────────────────────────────────────
    // §5.2 완비 검증 — 5개 조건 개별 결여 케이스
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("출퇴근 이력 없는 사용자가 seeking=true → JOB_SEEKING_NOT_ELIGIBLE")
    void turnOn_withoutAttendanceHistory_throwsNotEligible() {
        User u = user();
        employeeProfile(u); // 출퇴근 이력 없음

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), fullOnRequest()))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_NOT_ELIGIBLE"));
    }

    @Test
    @DisplayName("출퇴근 이력 있음 + 지역2 + 유형/업종/요일 완비 → ON 성공")
    void turnOn_withCompleteData_succeeds() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingProfileResponse resp = service.updateMyProfile(u.getId(), fullOnRequest());

        assertThat(resp.eligible()).isTrue();
        assertThat(resp.seeking()).isTrue();
        assertThat(resp.locations()).hasSize(2);
        assertThat(resp.seekingTypes()).containsExactlyInAnyOrder("SUBSTITUTE", "REGULAR");
        assertThat(resp.jobCategories()).containsExactlyInAnyOrder("CAFE", "BAKERY");
        assertThat(resp.availability()).hasSize(1);
    }

    @Test
    @DisplayName("희망지역 1개만 전달 → JOB_SEEKING_LOCATIONS_REQUIRED")
    void turnOn_withOneLocation_throwsLocationsRequired() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true, List.of("경기 고양시 일산동구 중산동 123-4"),
                List.of("SUBSTITUTE"), List.of("CAFE"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_LOCATIONS_REQUIRED"));
    }

    @Test
    @DisplayName("요일/시간 미기재 상태에서 ON → JOB_SEEKING_AVAILABILITY_REQUIRED")
    void turnOn_withoutAvailability_throwsAvailabilityRequired() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of("CAFE"),
                null);

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_AVAILABILITY_REQUIRED"));
    }

    @Test
    @DisplayName("구직 유형 0개로 ON → JOB_SEEKING_TYPES_REQUIRED")
    void turnOn_withZeroSeekingTypes_throwsTypesRequired() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of(), List.of("CAFE"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_TYPES_REQUIRED"));
    }

    @Test
    @DisplayName("업종 0개로 ON → JOB_SEEKING_CATEGORIES_INVALID")
    void turnOn_withZeroCategories_throwsCategoriesInvalid() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of(),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_CATEGORIES_INVALID"));
    }

    @Test
    @DisplayName("업종 4개 전달 → JOB_SEEKING_CATEGORIES_INVALID")
    void turnOn_withFourCategories_throwsCategoriesInvalid() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of("CAFE", "BAKERY", "KITCHEN", "FAST_FOOD"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_CATEGORIES_INVALID"));
    }

    @Test
    @DisplayName("enum 외 업종 값 → JOB_SEEKING_CATEGORIES_INVALID")
    void turnOn_withInvalidCategoryEnum_throwsCategoriesInvalid() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of("NOT_A_CATEGORY"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_CATEGORIES_INVALID"));
    }

    @Test
    @DisplayName("availability 요일 중복 → JOB_SEEKING_INVALID_DAYS")
    void turnOn_withDuplicateAvailabilityDay_throwsInvalidDays() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of("CAFE"),
                List.of(
                        new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0)),
                        new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(19, 0), LocalTime.of(22, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_INVALID_DAYS"));
    }

    @Test
    @DisplayName("availability 야간(종료≤시작) → JOB_SEEKING_INVALID_DAYS")
    void turnOn_withOvernightAvailability_throwsInvalidDays() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        JobSeekingUpdateRequest req = new JobSeekingUpdateRequest(
                true,
                List.of("경기 고양시 일산동구 중산동 123-4", "경기 고양시 덕양구 화정동 56-7"),
                List.of("SUBSTITUTE"), List.of("CAFE"),
                List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(22, 0), LocalTime.of(6, 0))));

        assertThatThrownBy(() -> service.updateMyProfile(u.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_SEEKING_INVALID_DAYS"));
    }

    // ─────────────────────────────────────────────────────────────────
    // §2 #6 OFF→ON 데이터 유지
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("ON → OFF → 재ON(추가 입력 없이) — OFF 후에도 데이터 유지, 재ON 성공")
    void toggleOffThenOn_retainsData() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        grantEligibility(emp, store);

        service.updateMyProfile(u.getId(), fullOnRequest());

        JobSeekingProfileResponse afterOff = service.updateMyProfile(
                u.getId(), new JobSeekingUpdateRequest(false, null, null, null, null));
        assertThat(afterOff.seeking()).isFalse();
        assertThat(afterOff.locations()).hasSize(2);
        assertThat(afterOff.seekingTypes()).containsExactlyInAnyOrder("SUBSTITUTE", "REGULAR");
        assertThat(afterOff.jobCategories()).containsExactlyInAnyOrder("CAFE", "BAKERY");
        assertThat(afterOff.availability()).hasSize(1);

        JobSeekingProfileResponse afterReOn = service.updateMyProfile(
                u.getId(), new JobSeekingUpdateRequest(true, null, null, null, null));
        assertThat(afterReOn.seeking()).isTrue();
        assertThat(afterReOn.locations()).hasSize(2);
        assertThat(afterReOn.seekingTypes()).containsExactlyInAnyOrder("SUBSTITUTE", "REGULAR");
        assertThat(afterReOn.jobCategories()).containsExactlyInAnyOrder("CAFE", "BAKERY");
        assertThat(afterReOn.availability()).hasSize(1);
    }

    // ─────────────────────────────────────────────────────────────────
    // getMyProfile — 프로필 없음/현재 소속/birthDate null
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("프로필 없는 사용자 조회 → 기본값(구직 OFF) 응답, 404 아님")
    void getMyProfile_withoutProfile_returnsDefault() {
        User u = user();
        employeeProfile(u);

        JobSeekingProfileResponse resp = service.getMyProfile(u.getId());

        assertThat(resp.seeking()).isFalse();
        assertThat(resp.eligible()).isFalse();
        assertThat(resp.locations()).isEmpty();
        assertThat(resp.currentEmployment()).isNull();
    }

    @Test
    @DisplayName("현재 소속(활성 재직) 없음(전부 비활성) → currentEmployment=null")
    void getMyProfile_withoutActiveEmployment_returnsNullCurrentEmployment() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        EmployeeStoreRelation rel = relationRepo.save(new EmployeeStoreRelation(emp, store));
        rel.changeActive(false);
        relationRepo.save(rel);

        JobSeekingProfileResponse resp = service.getMyProfile(u.getId());
        assertThat(resp.currentEmployment()).isNull();
    }

    @Test
    @DisplayName("현재 소속(활성 재직) 있음 → storeName/hireDate 노출")
    void getMyProfile_withActiveEmployment_returnsCurrentEmployment() {
        User u = user();
        EmployeeProfile emp = employeeProfile(u);
        Store store = store("카페");
        relationRepo.save(new EmployeeStoreRelation(emp, store));

        JobSeekingProfileResponse resp = service.getMyProfile(u.getId());
        assertThat(resp.currentEmployment()).isNotNull();
        assertThat(resp.currentEmployment().storeName()).isEqualTo("테스트매장");
    }

    // ─────────────────────────────────────────────────────────────────
    // 리스트 조회 — 4km 매칭·필터·PII·예외
    // ─────────────────────────────────────────────────────────────────

    /** GeoUtils 의 정확한 haversine 역산 — 순위도 오프셋(경도 동일)만으로 목표 거리(미터)를 만든다. */
    private double latitudeFor(double storeLat, double targetMeters) {
        double deltaDegrees = Math.toDegrees(targetMeters / 6_371_000.0);
        return storeLat + deltaDegrees;
    }

    private User seekerWithLocation(Store store, double distanceMeters, List<String> types,
                                     List<String> categories, List<JobAvailabilityDay> availability) {
        User u = user();
        double seekerLat = latitudeFor(store.getLatitude(), distanceMeters);
        JobSeekingProfile profile = new JobSeekingProfile(u);
        // 두 번째 지역은 충분히 멀리 두어(50km) "가까운 쪽" 판정에 영향을 주지 않게 한다.
        double farLat = latitudeFor(store.getLatitude(), 50_000);
        profile.updateLocations(
                "희망지역A", seekerLat, store.getLongitude(),
                "희망지역B(먼곳)", farLat, store.getLongitude());
        profile.updateSeekingTypes(types);
        profile.updateJobCategories(categories);
        profile.updateAvailability(availability);
        profile.turnOn();
        jobSeekingProfileRepo.save(profile);
        return u;
    }

    private List<JobAvailabilityDay> mondayAvailability() {
        return List.of(new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(18, 0)));
    }

    @Test
    @DisplayName("4km 경계값: 3,999m(포함)/4,000m(포함)/4,001m(제외)")
    void listJobSeekers_boundaryDistances() {
        Store store = store("카페");
        User within3999 = seekerWithLocation(store, 3_999, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        User within4000 = seekerWithLocation(store, 4_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        User beyond4001 = seekerWithLocation(store, 4_001, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);

        assertThat(result).extracting(JobSeekerListItemResponse::userId)
                .contains(within3999.getId(), within4000.getId())
                .doesNotContain(beyond4001.getId());
    }

    @Test
    @DisplayName("두 지역 중 한쪽만 4km 이내 → 포함, distanceMeters는 가까운 쪽")
    void listJobSeekers_usesCloserOfTwoLocations() {
        Store store = store("카페");
        User u = user();
        double closeLat = latitudeFor(store.getLatitude(), 1_500);
        double farLat = latitudeFor(store.getLatitude(), 20_000);
        JobSeekingProfile profile = new JobSeekingProfile(u);
        profile.updateLocations("가까운지역", closeLat, store.getLongitude(), "먼지역", farLat, store.getLongitude());
        profile.updateSeekingTypes(List.of("SUBSTITUTE"));
        profile.updateJobCategories(List.of("CAFE"));
        profile.updateAvailability(mondayAvailability());
        profile.turnOn();
        jobSeekingProfileRepo.save(profile);

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).distanceMeters()).isCloseTo(1_500L, org.assertj.core.data.Offset.offset(2L));
    }

    @Test
    @DisplayName("구직 OFF 사용자는 리스트에 노출되지 않는다")
    void listJobSeekers_excludesSeekingOff() {
        Store store = store("카페");
        User u = user();
        JobSeekingProfile profile = new JobSeekingProfile(u);
        double lat = latitudeFor(store.getLatitude(), 1_000);
        profile.updateLocations("A", lat, store.getLongitude(), "B", lat, store.getLongitude());
        profile.updateSeekingTypes(List.of("SUBSTITUTE"));
        profile.updateJobCategories(List.of("CAFE"));
        profile.updateAvailability(mondayAvailability());
        // turnOn() 호출 없음 — seeking=false 기본값 유지
        jobSeekingProfileRepo.save(profile);

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);
        assertThat(result).extracting(JobSeekerListItemResponse::userId).doesNotContain(u.getId());
    }

    @Test
    @DisplayName("해당 매장에 이미 활성 재직중인 직원은 리스트에서 제외된다")
    void listJobSeekers_excludesActiveEmployeeOfStore() {
        Store store = store("카페");
        User u = seekerWithLocation(store, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        EmployeeProfile emp = employeeProfile(u);
        relationRepo.save(new EmployeeStoreRelation(emp, store)); // 활성 재직

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);
        assertThat(result).extracting(JobSeekerListItemResponse::userId).doesNotContain(u.getId());
    }

    @Test
    @DisplayName("탈퇴 회원은 리스트에서 제외된다")
    void listJobSeekers_excludesWithdrawnUser() {
        Store store = store("카페");
        User u = seekerWithLocation(store, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        u.markWithdrawn();
        userRepo.save(u);

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);
        assertThat(result).extracting(JobSeekerListItemResponse::userId).doesNotContain(u.getId());
    }

    @Test
    @DisplayName("birthDate null → age=null, 예외 없음")
    void listJobSeekers_withNullBirthDate_returnsNullAge() {
        Store store = store("카페");
        User u = seekerWithLocation(store, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        assertThat(u.getBirthDate()).isNull();

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, null);
        JobSeekerListItemResponse item = result.stream().filter(r -> r.userId().equals(u.getId())).findFirst().orElseThrow();
        assertThat(item.age()).isNull();
    }

    @Test
    @DisplayName("매장 업종 매핑 → categoryMatched: 카페 매장 × CAFE 구직자 true / 매핑 불가 업종 false 폴백")
    void listJobSeekers_derivesCategoryMatched() {
        Store cafeStore = store("카페");
        User cafeMatch = seekerWithLocation(cafeStore, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());

        List<JobSeekerListItemResponse> cafeResult = service.getJobSeekersForStore(cafeStore.getId(), null, null);
        JobSeekerListItemResponse cafeItem = cafeResult.stream()
                .filter(r -> r.userId().equals(cafeMatch.getId())).findFirst().orElseThrow();
        assertThat(cafeItem.categoryMatched()).isTrue();

        Store unmappedStore = store("헬스장/필라테스");
        User unmappedSeeker = seekerWithLocation(unmappedStore, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        List<JobSeekerListItemResponse> unmappedResult = service.getJobSeekersForStore(unmappedStore.getId(), null, null);
        JobSeekerListItemResponse unmappedItem = unmappedResult.stream()
                .filter(r -> r.userId().equals(unmappedSeeker.getId())).findFirst().orElseThrow();
        assertThat(unmappedItem.categoryMatched()).isFalse();
    }

    @Test
    @DisplayName("?workType=SUBSTITUTE 필터 — SUBSTITUTE 포함 구직자만 반환, REGULAR 단독은 제외")
    void listJobSeekers_filtersByWorkType() {
        Store store = store("카페");
        User substituteSeeker = seekerWithLocation(store, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());
        User regularSeeker = seekerWithLocation(store, 1_200, List.of("REGULAR"), List.of("CAFE"), mondayAvailability());

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), "SUBSTITUTE", null);

        assertThat(result).extracting(JobSeekerListItemResponse::userId)
                .contains(substituteSeeker.getId())
                .doesNotContain(regularSeeker.getId());
    }

    @Test
    @DisplayName("?availableOn=금요일 날짜 필터 — 금요일 가능시간 보유자만 + availableToday 파생 정확성")
    void listJobSeekers_filtersByAvailableOn() {
        Store store = store("카페");
        List<JobAvailabilityDay> fridayOnly =
                List.of(new JobAvailabilityDay(DayOfWeek.FRIDAY, LocalTime.of(9, 0), LocalTime.of(18, 0)));
        User fridaySeeker = seekerWithLocation(store, 1_000, List.of("SUBSTITUTE"), List.of("CAFE"), fridayOnly);
        User mondaySeeker = seekerWithLocation(store, 1_100, List.of("SUBSTITUTE"), List.of("CAFE"), mondayAvailability());

        // 2026-07-17 은 금요일(§8.1 "availableOn=금요일 날짜" 검증용 고정 일자)
        LocalDate friday = LocalDate.of(2026, 7, 17);
        assertThat(friday.getDayOfWeek()).isEqualTo(DayOfWeek.FRIDAY);

        List<JobSeekerListItemResponse> result = service.getJobSeekersForStore(store.getId(), null, friday);

        assertThat(result).extracting(JobSeekerListItemResponse::userId)
                .contains(fridaySeeker.getId())
                .doesNotContain(mondaySeeker.getId());
    }

    @Test
    @DisplayName("매장 위치 미설정 → STORE_LOCATION_NOT_SET")
    void listJobSeekers_withoutStoreLocation_throwsStoreLocationNotSet() {
        String biz = String.format("%010d", 8880000000L + (bizSeq++));
        Store store = storeRepo.save(new Store("위치없는매장", biz, "02-000-0000", "카페", 10_000, 100));

        assertThatThrownBy(() -> service.getJobSeekersForStore(store.getId(), null, null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("STORE_LOCATION_NOT_SET"));
    }

    @Test
    @DisplayName("존재하지 않는 매장 조회 → ENTITY_NOT_FOUND(404)")
    void listJobSeekers_withMissingStore_throwsEntityNotFound() {
        assertThatThrownBy(() -> service.getJobSeekersForStore(999_999_999L, null, null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("ENTITY_NOT_FOUND"));
    }
}
