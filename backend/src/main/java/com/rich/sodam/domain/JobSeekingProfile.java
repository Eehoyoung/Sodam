package com.rich.sodam.domain;

import com.rich.sodam.config.converter.JobAvailabilityListConverter;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * 인증채용(구직·구인) 구직 프로필 — {@code User} 1:1(260711_작업통합.md Part 2 §3.1, V53).
 *
 * <p>{@code EmployeeProfile}이 아닌 {@code User} 기준으로 두는 이유: 퇴사자(활성 재직 관계 없음)도
 * 과거 출퇴근 이력만 있으면 구직 가능해야 하므로 재직 여부와 독립적이다. 자격(인증) 판정은
 * {@code AttendanceRepository.existsByEmployeeProfile_Id}로 별도 조회한다(Phase 2 서비스 책임).</p>
 *
 * <p>희망지역 주소·좌표는 매장 주소와 동급 민감도로 취급해 PII 암호화 컨버터를 적용하지 않는다
 * (계획서 §3.1). 단 로그에 좌표·주소 원문을 남기지 않는다(security.md — GPS 좌표 로그 금지와 동일 취지).</p>
 *
 * <p>세터 대신 의도가 드러나는 도메인 메서드만 노출한다. {@code turnOn()}/{@code turnOff()}는 상태
 * 전환만 담당하고, "구직 ON 전환에 필요한 데이터 완비" 같은 업무 규칙 검증은 서비스 레이어
 * (Phase 2 {@code JobSeekingService})의 책임이다.</p>
 */
@Entity
@Table(name = "job_seeking_profile", indexes = {
        @Index(name = "idx_job_seeking_seeking", columnList = "seeking")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobSeekingProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** 구직중 여부 — true 인 프로필만 사장 리스트에 노출된다. */
    @Column(nullable = false)
    private boolean seeking = false;

    /** 희망지역1 주소(주소검색 모달 선택값). */
    @Column(name = "location1_address")
    private String location1Address;

    /** 희망지역1 지오코딩 좌표(저장 시 1회 지오코딩 — 조회마다 API를 부르지 않기 위함). */
    @Column(name = "location1_latitude")
    private Double location1Latitude;

    @Column(name = "location1_longitude")
    private Double location1Longitude;

    /** 희망지역2 주소. 구직 ON 전환 시 지역 정확히 2개가 필수다(§2 #4). */
    @Column(name = "location2_address")
    private String location2Address;

    @Column(name = "location2_latitude")
    private Double location2Latitude;

    @Column(name = "location2_longitude")
    private Double location2Longitude;

    /** 구직 유형 CSV — {@code SUBSTITUTE}(당일 대타) / {@code REGULAR}(정기), 복수 선택 가능(§2 #9). */
    @Column(name = "seeking_types", length = 50)
    private String seekingTypes;

    /** 업종 분류 CSV — {@link com.rich.sodam.domain.type.JobCategory} enum 이름, 최대 3개(§2 #11). */
    @Column(name = "job_categories", length = 100)
    private String jobCategories;

    /**
     * 요일별 근무 가능 시간 — {@link JobAvailabilityListConverter}가 단일 JSON 컬럼
     * ({@code availability_json})으로 직렬화한다(WorkScheduleListConverter, V41과 동일 패턴).
     */
    @Convert(converter = JobAvailabilityListConverter.class)
    @Column(name = "availability_json", length = 2000)
    private List<JobAvailabilityDay> availability;

    /**
     * 바로출근(즉시 근무 가능) 상태 — 당일 대타({@code SUBSTITUTE}) 유형 구직자가 스스로 켜는
     * 즉시성 시그널(§17.2). 자정(Asia/Seoul) 경과 시 false로 취급하는 lazy 해제 판정은 조회 시점에
     * 서비스 레이어(Phase 2)가 {@link #instantAvailableSetAt}을 기준으로 수행한다 — 이 엔티티는
     * 원본 상태만 저장한다.
     */
    @Column(name = "instant_available", nullable = false)
    private boolean instantAvailable = false;

    /** {@link #instantAvailable}을 ON으로 전환한 시각. OFF 전환 시에는 값을 유지한다(재 ON 판정은 Phase 2 책임). */
    @Column(name = "instant_available_set_at")
    private LocalDateTime instantAvailableSetAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public JobSeekingProfile(User user) {
        this.user = user;
        this.seeking = false;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 구직 상태를 켠다. 완비 검증(자격·희망지역·유형·업종·근무가능시간)은 서비스 레이어 책임 —
     * 이 메서드는 단순 상태 전환만 수행한다.
     */
    public void turnOn() {
        this.seeking = true;
        touch();
    }

    /** 구직 상태를 끈다. 희망지역·근무가능 등 나머지 데이터는 그대로 유지한다(재 ON 시 복구, §2 #6). */
    public void turnOff() {
        this.seeking = false;
        touch();
    }

    /** 희망지역 2곳의 주소+좌표를 갱신한다(지오코딩은 호출측 책임). */
    public void updateLocations(String address1, Double latitude1, Double longitude1,
                                 String address2, Double latitude2, Double longitude2) {
        this.location1Address = address1;
        this.location1Latitude = latitude1;
        this.location1Longitude = longitude1;
        this.location2Address = address2;
        this.location2Latitude = latitude2;
        this.location2Longitude = longitude2;
        touch();
    }

    /** 구직 유형(SUBSTITUTE/REGULAR 등)을 갱신한다. null/빈 리스트면 CSV 컬럼을 비운다. */
    public void updateSeekingTypes(List<String> types) {
        this.seekingTypes = joinOrNull(types);
        touch();
    }

    /** 업종 분류({@link com.rich.sodam.domain.type.JobCategory} 이름)를 갱신한다. */
    public void updateJobCategories(List<String> categories) {
        this.jobCategories = joinOrNull(categories);
        touch();
    }

    /** 요일별 근무 가능 시간을 갱신한다. null/빈 리스트면 컬럼을 비운다. */
    public void updateAvailability(List<JobAvailabilityDay> availability) {
        this.availability = (availability == null || availability.isEmpty()) ? null : List.copyOf(availability);
        touch();
    }

    /**
     * 바로출근 상태를 전환한다. ON으로 켤 때만 {@link #instantAvailableSetAt}을 현재 시각으로 갱신하고,
     * OFF로 끌 때는 기존 set_at 값을 그대로 유지한다 — 자정 경과 여부에 따른 lazy 해제 판정(§17.2)은
     * 이 시각을 기준으로 서비스 레이어가 수행하므로, 여기서 임의로 지우면 판정 기준점을 잃는다.
     *
     * <p>SUBSTITUTE 유형 여부 등 업무 규칙 검증은 서비스 레이어(Phase 2) 책임 — 이 메서드는 상태
     * 전환만 담당한다.</p>
     */
    public void setInstantAvailable(boolean on) {
        this.instantAvailable = on;
        if (on) {
            this.instantAvailableSetAt = LocalDateTime.now();
        }
        touch();
    }

    /** 희망지역 2곳(주소+좌표)이 모두 완비되었는지 — 구직 ON 전환 전제조건 중 하나(§2 #4). */
    public boolean hasCompleteLocations() {
        return hasLocation(location1Address, location1Latitude, location1Longitude)
                && hasLocation(location2Address, location2Latitude, location2Longitude);
    }

    /** 해당 요일에 근무 가능 시간이 등록되어 있는지(§2 #10 "오늘 가능" 판정에 사용). */
    public boolean isAvailableOn(DayOfWeek day) {
        if (day == null || availability == null) {
            return false;
        }
        return availability.stream().anyMatch(item -> item.day() == day);
    }

    /** {@link #seekingTypes} CSV를 리스트로 파싱 — 미설정이면 빈 리스트. */
    public List<String> getSeekingTypesList() {
        return splitOrEmpty(seekingTypes);
    }

    /** {@link #jobCategories} CSV를 리스트로 파싱 — 미설정이면 빈 리스트. */
    public List<String> getJobCategoriesList() {
        return splitOrEmpty(jobCategories);
    }

    private static boolean hasLocation(String address, Double latitude, Double longitude) {
        return address != null && !address.isBlank() && latitude != null && longitude != null;
    }

    private static String joinOrNull(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values);
    }

    private static List<String> splitOrEmpty(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
