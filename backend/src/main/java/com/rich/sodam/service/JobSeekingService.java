package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.JobAvailabilityDay;
import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.dto.request.JobSeekingUpdateRequest;
import com.rich.sodam.dto.response.GeocodingResult;
import com.rich.sodam.dto.response.JobSeekerListItemResponse;
import com.rich.sodam.dto.response.JobSeekingProfileResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.JobOfferRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 인증채용(구직) 서비스 — 자격 검증·부분 업데이트·4km 매칭·업종 매핑
 * (260711_작업통합.md Part 2 §4·§5.2·§6.3).
 *
 * <p>캐시(@Cacheable)는 v1 미적용 — 구직 상태는 실시간성이 중요하고 무효화 교차점(직원 토글 → 사장
 * 리스트)이 넓어 이득이 없다(§6.3). 현재 소속 조회는 구직자별 1쿼리(N+1 유사)이나 v1 리스트 규모가
 * 작아 허용한다(§6.3, 후속 IN 절 배치 개선은 백로그). {@code offerStatus} 파생을 위한 최신 제안 조회도
 * 동일한 기준으로 구직자별 1쿼리를 허용한다(§15.3 offerStatus 필드 갭 해소, Phase6 팔로우업).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobSeekingService {

    /** 매장별 출퇴근 인증 반경({@code store.radius})과 무관한 별도 상수(§4-4). */
    private static final int MATCH_RADIUS_METERS = 4_000;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final JobSeekingProfileRepository jobSeekingProfileRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final GeocodingService geocodingService;
    private final JobOfferRepository jobOfferRepository;
    private final JobOfferService jobOfferService;

    // ─────────────────────────────────────────────────────────────────
    // GET /api/job-seekers/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public JobSeekingProfileResponse getMyProfile(Long userId) {
        getUser(userId);
        boolean eligible = attendanceRepository.existsByEmployeeProfile_Id(userId);
        JobSeekingProfileResponse.CurrentEmployment currentEmployment = resolveCurrentEmployment(userId);

        return jobSeekingProfileRepository.findByUser_Id(userId)
                .map(profile -> toProfileResponse(profile, eligible, currentEmployment))
                .orElseGet(() -> new JobSeekingProfileResponse(
                        eligible, false, List.of(), List.of(), List.of(), List.of(), currentEmployment));
    }

    // ─────────────────────────────────────────────────────────────────
    // PUT /api/job-seekers/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobSeekingProfileResponse updateMyProfile(Long userId, JobSeekingUpdateRequest request) {
        User user = getUser(userId);
        JobSeekingProfile profile = jobSeekingProfileRepository.findByUser_Id(userId)
                .orElseGet(() -> new JobSeekingProfile(user));

        boolean turningOn = Boolean.TRUE.equals(request.seeking());
        if (turningOn) {
            applyLocationsIfPresent(profile, request.locationAddresses());
            applySeekingTypesIfPresent(profile, request.seekingTypes());
            applyJobCategoriesIfPresent(profile, request.jobCategories());
            applyAvailabilityIfPresent(profile, request.availability());
            validateCompleteOnTurnOn(userId, profile);
            profile.turnOn();
        } else {
            // 무검증 — 상태만 내리고 나머지 데이터는 그대로 유지한다(§5.2, §2 #6 OFF→ON 복구 사양).
            profile.turnOff();
        }

        profile = jobSeekingProfileRepository.save(profile);

        boolean eligible = attendanceRepository.existsByEmployeeProfile_Id(userId);
        JobSeekingProfileResponse.CurrentEmployment currentEmployment = resolveCurrentEmployment(userId);
        return toProfileResponse(profile, eligible, currentEmployment);
    }

    private void applyLocationsIfPresent(JobSeekingProfile profile, List<String> addresses) {
        if (addresses == null) {
            return;
        }
        List<String> trimmed = addresses.stream()
                .map(a -> a == null ? "" : a.trim())
                .filter(a -> !a.isEmpty())
                .toList();
        if (trimmed.size() != 2) {
            throw new BusinessException("희망지역은 정확히 2개를 입력해야 해요.", "JOB_SEEKING_LOCATIONS_REQUIRED");
        }
        GeocodingResult loc1 = geocodeOrThrow(trimmed.get(0));
        GeocodingResult loc2 = geocodeOrThrow(trimmed.get(1));
        profile.updateLocations(
                trimmed.get(0), loc1.getLatitude(), loc1.getLongitude(),
                trimmed.get(1), loc2.getLatitude(), loc2.getLongitude());
    }

    private GeocodingResult geocodeOrThrow(String address) {
        try {
            return geocodingService.getCoordinates(address);
        } catch (RuntimeException e) {
            // 좌표/주소 원문은 로그에 남기지 않는다(security.md).
            log.warn("구직 희망지역 지오코딩 실패");
            throw new BusinessException("입력하신 주소를 확인할 수 없어요. 다시 입력해 주세요.",
                    "JOB_SEEKING_LOCATIONS_REQUIRED");
        }
    }

    private void applySeekingTypesIfPresent(JobSeekingProfile profile, List<String> types) {
        if (types == null) {
            return;
        }
        profile.updateSeekingTypes(types);
    }

    private void applyJobCategoriesIfPresent(JobSeekingProfile profile, List<String> categories) {
        if (categories == null) {
            return;
        }
        if (categories.isEmpty() || categories.size() > 3) {
            throw new BusinessException("업종은 1~3개를 선택해야 해요.", "JOB_SEEKING_CATEGORIES_INVALID");
        }
        Set<String> seen = new HashSet<>();
        for (String category : categories) {
            try {
                JobCategory.valueOf(category);
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new BusinessException("올바르지 않은 업종이 포함되어 있어요.", "JOB_SEEKING_CATEGORIES_INVALID");
            }
            if (!seen.add(category)) {
                throw new BusinessException("업종이 중복됐어요.", "JOB_SEEKING_CATEGORIES_INVALID");
            }
        }
        profile.updateJobCategories(categories);
    }

    private void applyAvailabilityIfPresent(JobSeekingProfile profile, List<JobAvailabilityDay> availability) {
        if (availability == null) {
            return;
        }
        Set<DayOfWeek> seenDays = new HashSet<>();
        for (JobAvailabilityDay item : availability) {
            if (item == null || item.day() == null || item.startTime() == null || item.endTime() == null) {
                throw new BusinessException("근무 가능 요일/시간을 확인해 주세요.", "JOB_SEEKING_INVALID_DAYS");
            }
            if (!seenDays.add(item.day())) {
                throw new BusinessException("요일이 중복됐어요.", "JOB_SEEKING_INVALID_DAYS");
            }
            if (!item.startTime().isBefore(item.endTime())) {
                // v1은 야간(종료≤시작) 시간대를 허용하지 않는다(§3.1, §13-6).
                throw new BusinessException("종료 시각은 시작 시각보다 늦어야 해요. 야간 시간대는 아직 지원하지 않아요.",
                        "JOB_SEEKING_INVALID_DAYS");
            }
        }
        profile.updateAvailability(availability);
    }

    /**
     * 구직 ON 전환 완비 검증(§5.2 ①~⑤). 하나라도 결여되면 대응 errorCode 로 400을 던진다.
     * 순서는 스펙 bullet 순서(①자격 ②지역 ③유형 ④업종 ⑤가능시간)를 그대로 따른다.
     */
    private void validateCompleteOnTurnOn(Long userId, JobSeekingProfile profile) {
        if (!attendanceRepository.existsByEmployeeProfile_Id(userId)) {
            throw new BusinessException("소담으로 출퇴근한 이력이 있어야 이용할 수 있어요.", "JOB_SEEKING_NOT_ELIGIBLE");
        }
        if (!profile.hasCompleteLocations()) {
            throw new BusinessException("희망지역 2곳을 모두 입력해 주세요.", "JOB_SEEKING_LOCATIONS_REQUIRED");
        }
        if (profile.getSeekingTypesList().isEmpty()) {
            throw new BusinessException("구직 유형을 1개 이상 선택해 주세요.", "JOB_SEEKING_TYPES_REQUIRED");
        }
        List<String> categories = profile.getJobCategoriesList();
        if (categories.isEmpty() || categories.size() > 3) {
            throw new BusinessException("업종을 1~3개 선택해 주세요.", "JOB_SEEKING_CATEGORIES_INVALID");
        }
        if (profile.getAvailability() == null || profile.getAvailability().isEmpty()) {
            throw new BusinessException("근무 가능 요일/시간을 1개 이상 입력해 주세요.", "JOB_SEEKING_AVAILABILITY_REQUIRED");
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/stores/{storeId}/job-seekers
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobSeekerListItemResponse> getJobSeekersForStore(Long storeId, String workType, LocalDate availableOn) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));
        if (!store.hasLocationSet()) {
            throw new BusinessException("매장 위치를 먼저 설정해 주세요.", "STORE_LOCATION_NOT_SET");
        }

        DayOfWeek today = LocalDate.now(SEOUL).getDayOfWeek();
        String normalizedWorkType = (workType == null || workType.isBlank()) ? null : workType.trim();

        List<JobSeekerListItemResponse> result = new ArrayList<>();
        for (JobSeekingProfile profile : jobSeekingProfileRepository.findAllSeekingWithUser()) {
            User seeker = profile.getUser();
            if (seeker == null || seeker.isWithdrawn()) {
                continue;
            }
            if (employeeStoreRelationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(seeker.getId(), storeId)) {
                continue;
            }

            Double distance = closestDistanceMeters(store, profile);
            if (distance == null || distance > MATCH_RADIUS_METERS) {
                continue;
            }

            List<String> types = profile.getSeekingTypesList();
            if (normalizedWorkType != null && !types.contains(normalizedWorkType)) {
                continue;
            }

            if (availableOn != null && !profile.isAvailableOn(availableOn.getDayOfWeek())) {
                continue;
            }

            result.add(buildListItem(store, profile, seeker, distance, today));
        }

        result.sort(Comparator.comparingLong(JobSeekerListItemResponse::distanceMeters));
        return result;
    }

    private JobSeekerListItemResponse buildListItem(Store store, JobSeekingProfile profile, User seeker,
                                                      double distanceMeters, DayOfWeek today) {
        List<String> desiredLocations = new ArrayList<>();
        if (profile.getLocation1Address() != null) {
            desiredLocations.add(profile.getLocation1Address());
        }
        if (profile.getLocation2Address() != null) {
            desiredLocations.add(profile.getLocation2Address());
        }
        List<JobAvailabilityDay> availability = profile.getAvailability() == null ? List.of() : profile.getAvailability();

        return new JobSeekerListItemResponse(
                seeker.getId(),
                seeker.getName(),
                calculateAge(seeker.getBirthDate()),
                resolveCurrentEmployment(seeker.getId()),
                desiredLocations,
                profile.getSeekingTypesList(),
                profile.getJobCategoriesList(),
                categoryMatched(store, profile),
                availability,
                profile.isAvailableOn(today),
                Math.round(distanceMeters),
                resolveOfferStatus(store.getId(), seeker.getId()));
    }

    /**
     * 이 매장이 이 구직자에게 보낸 최신 제안의 유효 상태(§15.3 offerStatus 필드 갭 해소). 제안이 없으면
     * null. 만료 판정은 {@link JobOfferService#effectiveStatusOf(JobOffer)} 로 위임해 lazy 판정 로직을
     * 중복 구현하지 않는다(§10 Phase5 원칙).
     */
    private String resolveOfferStatus(Long storeId, Long seekerId) {
        return jobOfferRepository.findFirstByStore_IdAndTargetUser_IdOrderByCreatedAtDesc(storeId, seekerId)
                .map(jobOfferService::effectiveStatusOf)
                .map(Enum::name)
                .orElse(null);
    }

    /** 두 희망지역 중 매장에 더 가까운 쪽까지의 거리(미터). 좌표가 둘 다 없으면 null(리스트 제외 대상). */
    private Double closestDistanceMeters(Store store, JobSeekingProfile profile) {
        Double d1 = distanceOrNull(store, profile.getLocation1Latitude(), profile.getLocation1Longitude());
        Double d2 = distanceOrNull(store, profile.getLocation2Latitude(), profile.getLocation2Longitude());
        if (d1 == null) {
            return d2;
        }
        if (d2 == null) {
            return d1;
        }
        return Math.min(d1, d2);
    }

    private Double distanceOrNull(Store store, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return com.rich.sodam.util.GeoUtils.calculateDistance(store.getLatitude(), store.getLongitude(), latitude, longitude);
    }

    /** 매장 업종({@code Store.businessType}, 자유 문자열)과 구직자 희망 업종의 일치 여부. 매핑 불가 시 false 폴백(§8.1). */
    private boolean categoryMatched(Store store, JobSeekingProfile profile) {
        JobCategory mapped = mapBusinessType(store.getBusinessType());
        if (mapped == null) {
            return false;
        }
        return profile.getJobCategoriesList().contains(mapped.name());
    }

    /**
     * 매장 업종 자유 문자열 → {@link JobCategory} 간이 매핑(이 서비스 내부 전용, §6.1 신규 결합 지점).
     * 표준 업종분류(frontend businessTypes.ts)와 자유 입력을 모두 포용하기 위해 키워드 포함 검사로
     * 판정한다 — 정확히 일치하는 항목이 없으면 매핑 불가로 처리해 categoryMatched=false 로 폴백한다.
     */
    private JobCategory mapBusinessType(String businessType) {
        if (businessType == null || businessType.isBlank()) {
            return null;
        }
        String t = businessType.trim();
        if (t.contains("카페")) return JobCategory.CAFE;
        if (t.contains("베이커리") || t.contains("빵")) return JobCategory.BAKERY;
        if (t.contains("패스트푸드")) return JobCategory.FAST_FOOD;
        if (t.contains("치킨") || t.contains("호프") || t.contains("주점") || t.contains("술집") || t.contains("바")) {
            return JobCategory.PUB_BAR;
        }
        if (t.contains("배달")) return JobCategory.DELIVERY_DRIVING;
        if (t.contains("편의점")) return JobCategory.CONVENIENCE_STORE;
        if (t.contains("마트") || t.contains("슈퍼") || t.contains("소매")
                || t.contains("정육") || t.contains("청과") || t.contains("수산")) {
            return JobCategory.MART_SALES;
        }
        if (t.contains("한식") || t.contains("중식") || t.contains("일식") || t.contains("양식")
                || t.contains("분식") || t.contains("음식점")) {
            return JobCategory.RESTAURANT_HALL;
        }
        if (t.contains("주방") || t.contains("조리")) return JobCategory.KITCHEN;
        if (t.contains("패밀리레스토랑")) return JobCategory.FAMILY_RESTAURANT;
        if (t.contains("사무") || t.contains("부업")) return JobCategory.OFFICE_SIDE_JOB;
        return null;
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
    }

    /**
     * 활성 재직(현재 소속) 조회 — 구직자별 1쿼리(N+1 유사, §6.3 허용 범위). 복수 활성 소속이면 리포지토리가
     * 이미 최근 hireDate 순으로 정렬해 반환하므로 첫 항목을 채택한다.
     */
    private JobSeekingProfileResponse.CurrentEmployment resolveCurrentEmployment(Long userId) {
        List<EmployeeStoreRelation> active = employeeStoreRelationRepository.findActiveByEmployeeIdWithStore(userId);
        if (active.isEmpty()) {
            return null;
        }
        EmployeeStoreRelation relation = active.get(0);
        return new JobSeekingProfileResponse.CurrentEmployment(relation.getStore().getStoreName(), relation.getHireDate());
    }

    private JobSeekingProfileResponse toProfileResponse(JobSeekingProfile profile, boolean eligible,
                                                          JobSeekingProfileResponse.CurrentEmployment currentEmployment) {
        List<JobSeekingProfileResponse.DesiredLocation> locations = new ArrayList<>();
        if (profile.getLocation1Address() != null) {
            locations.add(new JobSeekingProfileResponse.DesiredLocation(profile.getLocation1Address()));
        }
        if (profile.getLocation2Address() != null) {
            locations.add(new JobSeekingProfileResponse.DesiredLocation(profile.getLocation2Address()));
        }
        List<JobAvailabilityDay> availability = profile.getAvailability() == null ? List.of() : profile.getAvailability();

        return new JobSeekingProfileResponse(
                eligible,
                profile.isSeeking(),
                locations,
                profile.getSeekingTypesList(),
                profile.getJobCategoriesList(),
                availability,
                currentEmployment);
    }

    /** birthDate 기반 만 나이 파생(PII 최소화 — 원문 생년월일은 응답에 포함하지 않는다). 미입력 시 null. */
    private Integer calculateAge(LocalDate birthDate) {
        if (birthDate == null) {
            return null;
        }
        return Period.between(birthDate, LocalDate.now(SEOUL)).getYears();
    }
}
