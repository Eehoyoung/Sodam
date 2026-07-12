package com.rich.sodam.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 인증채용 구직 프로필({@code JobSeekingProfile}) 도메인 메서드 단위 테스트
 * (260711_작업통합.md Part 2 §10 Phase 1 DoD).
 */
class JobSeekingProfileTest {

    private JobSeekingProfile newProfile() {
        User user = new User("seeker@sodam.test", "김소담");
        return new JobSeekingProfile(user);
    }

    @Test
    @DisplayName("생성 직후 구직 상태는 false")
    void createdOffByDefault() {
        JobSeekingProfile profile = newProfile();
        assertThat(profile.isSeeking()).isFalse();
        assertThat(profile.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("turnOn() 은 완비 검증 없이 seeking 만 true 로 전환한다")
    void turnOnSwitchesStateOnly() {
        JobSeekingProfile profile = newProfile();
        profile.turnOn();
        assertThat(profile.isSeeking()).isTrue();
        assertThat(profile.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("turnOff() 는 seeking 만 false 로 내리고 희망지역·근무가능 데이터는 유지한다")
    void turnOffKeepsData() {
        JobSeekingProfile profile = newProfile();
        profile.updateLocations("경기 고양시 일산동구 중산동", 37.1, 126.7,
                "경기 고양시 덕양구 화정동", 37.2, 126.8);
        profile.updateSeekingTypes(List.of("SUBSTITUTE", "REGULAR"));
        profile.turnOn();

        profile.turnOff();

        assertThat(profile.isSeeking()).isFalse();
        assertThat(profile.hasCompleteLocations()).isTrue();
        assertThat(profile.getSeekingTypesList()).containsExactly("SUBSTITUTE", "REGULAR");
    }

    @Test
    @DisplayName("updateLocations() 는 희망지역 2곳의 주소+좌표를 모두 갱신한다")
    void updateLocationsSetsBothSites() {
        JobSeekingProfile profile = newProfile();

        profile.updateLocations("경기 고양시 일산동구 중산동 123-4", 37.1, 126.7,
                "경기 고양시 덕양구 화정동 56-7", 37.2, 126.8);

        assertThat(profile.getLocation1Address()).isEqualTo("경기 고양시 일산동구 중산동 123-4");
        assertThat(profile.getLocation1Latitude()).isEqualTo(37.1);
        assertThat(profile.getLocation1Longitude()).isEqualTo(126.7);
        assertThat(profile.getLocation2Address()).isEqualTo("경기 고양시 덕양구 화정동 56-7");
        assertThat(profile.getLocation2Latitude()).isEqualTo(37.2);
        assertThat(profile.getLocation2Longitude()).isEqualTo(126.8);
    }

    @Test
    @DisplayName("hasCompleteLocations() 는 두 지역 모두 주소+좌표가 채워졌을 때만 true")
    void hasCompleteLocations() {
        JobSeekingProfile profile = newProfile();
        assertThat(profile.hasCompleteLocations()).isFalse();

        profile.updateLocations("주소1", 37.1, 126.7, null, null, null);
        assertThat(profile.hasCompleteLocations()).isFalse();

        profile.updateLocations("주소1", 37.1, 126.7, "주소2", 37.2, 126.8);
        assertThat(profile.hasCompleteLocations()).isTrue();
    }

    @Test
    @DisplayName("updateSeekingTypes() 는 CSV 로 저장되고 리스트로 다시 파싱된다 — null/빈 리스트는 비운다")
    void updateSeekingTypes() {
        JobSeekingProfile profile = newProfile();

        profile.updateSeekingTypes(List.of("SUBSTITUTE"));
        assertThat(profile.getSeekingTypes()).isEqualTo("SUBSTITUTE");
        assertThat(profile.getSeekingTypesList()).containsExactly("SUBSTITUTE");

        profile.updateSeekingTypes(List.of());
        assertThat(profile.getSeekingTypes()).isNull();
        assertThat(profile.getSeekingTypesList()).isEmpty();
    }

    @Test
    @DisplayName("updateJobCategories() 도 동일한 CSV 왕복 규칙을 따른다")
    void updateJobCategories() {
        JobSeekingProfile profile = newProfile();

        profile.updateJobCategories(List.of("CAFE", "BAKERY"));

        assertThat(profile.getJobCategories()).isEqualTo("CAFE,BAKERY");
        assertThat(profile.getJobCategoriesList()).containsExactly("CAFE", "BAKERY");
    }

    @Test
    @DisplayName("updateAvailability() 는 요일별 리스트를 그대로 보관한다")
    void updateAvailability() {
        JobSeekingProfile profile = newProfile();
        List<JobAvailabilityDay> availability = List.of(
                new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0)),
                new JobAvailabilityDay(DayOfWeek.SATURDAY, LocalTime.of(18, 0), LocalTime.of(22, 0)));

        profile.updateAvailability(availability);

        assertThat(profile.getAvailability()).containsExactlyElementsOf(availability);
    }

    @Test
    @DisplayName("isAvailableOn() 은 등록된 요일에만 true, 미등록 요일/빈 값은 false")
    void isAvailableOn() {
        JobSeekingProfile profile = newProfile();
        assertThat(profile.isAvailableOn(DayOfWeek.MONDAY)).isFalse();

        profile.updateAvailability(List.of(
                new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0))));

        assertThat(profile.isAvailableOn(DayOfWeek.MONDAY)).isTrue();
        assertThat(profile.isAvailableOn(DayOfWeek.TUESDAY)).isFalse();
        assertThat(profile.isAvailableOn(null)).isFalse();
    }

    @Test
    @DisplayName("생성 직후 바로출근 상태는 false, set_at 은 null")
    void instantAvailableOffByDefault() {
        JobSeekingProfile profile = newProfile();

        assertThat(profile.isInstantAvailable()).isFalse();
        assertThat(profile.getInstantAvailableSetAt()).isNull();
    }

    @Test
    @DisplayName("setInstantAvailable(true) 는 상태를 켜고 set_at 을 현재 시각으로 갱신한다")
    void setInstantAvailableOnSetsTimestamp() {
        JobSeekingProfile profile = newProfile();

        profile.setInstantAvailable(true);

        assertThat(profile.isInstantAvailable()).isTrue();
        assertThat(profile.getInstantAvailableSetAt()).isNotNull();
        assertThat(profile.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("setInstantAvailable(false) 는 상태만 끄고 기존 set_at 값은 그대로 유지한다")
    void setInstantAvailableOffKeepsTimestamp() {
        JobSeekingProfile profile = newProfile();
        profile.setInstantAvailable(true);
        var setAt = profile.getInstantAvailableSetAt();

        profile.setInstantAvailable(false);

        assertThat(profile.isInstantAvailable()).isFalse();
        assertThat(profile.getInstantAvailableSetAt()).isEqualTo(setAt);
    }
}
