package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TermsType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TermsAgreementRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-K — 개인 모드 상태·전환 자격 판정.
 *
 * <p>핵심은 <b>등급이 바뀌지 않는다</b>는 것(바뀌면 인증채용·증명서가 403 이 된다), 그리고
 * <b>퇴사 직후에는 권유하지 않는다</b>는 것이다(오조작·즉시 재고용·부당해고 다툼 고려).</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PersonalModeServiceTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private PersonalModeService personalModeService;
    @Autowired private ConsentService consentService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private TermsAgreementRepository termsAgreementRepository;

    /**
     * @param active        재직 중인 관계를 만들지
     * @param terminatedAgo 퇴사 처리 시 며칠 전으로 볼지(active=true 면 무시)
     */
    private User createEmployee(boolean active, int terminatedAgo) throws Exception {
        int n = SEQ.incrementAndGet();
        User user = new User("personalmode" + n + "@example.com", "개인모드" + n);
        user.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.saveAndFlush(user);

        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(user));
        Store store = storeRepository.save(
                new Store("모드매장" + n, String.format("%010d", 5_000_000_000L + n), "02-000-0000", "카페", 12_000, 100));

        EmployeeStoreRelation relation = relationRepository.save(new EmployeeStoreRelation(profile, store, 12_000));
        if (!active) {
            relation.changeActive(false);
            Field f = relation.getClass().getDeclaredField("deactivatedAt");
            f.setAccessible(true);
            f.set(relation, LocalDateTime.now().minusDays(terminatedAgo));
            relationRepository.saveAndFlush(relation);
        }
        return user;
    }

    @Test
    @DisplayName("재직 중이면 전환을 권유하지 않는다")
    void activeEmployeeIsNotSuggested() throws Exception {
        User user = createEmployee(true, 0);

        var status = personalModeService.status(user.getId());

        assertThat(status.activeStoreCount()).isEqualTo(1);
        assertThat(status.suggestConversion()).isFalse();
    }

    @Test
    @DisplayName("퇴사 직후(7일 미만)에는 권유하지 않는다 — 오조작·즉시 재고용·부당해고 다툼 고려")
    void recentlyTerminatedIsNotSuggestedYet() throws Exception {
        User user = createEmployee(false, 3);

        var status = personalModeService.status(user.getId());

        assertThat(status.activeStoreCount()).isZero();
        assertThat(status.suggestConversion()).isFalse();
    }

    @Test
    @DisplayName("퇴사 후 7일이 지나면 전환을 권유한다")
    void terminatedOverSevenDaysIsSuggested() throws Exception {
        User user = createEmployee(false, 10);

        var status = personalModeService.status(user.getId());

        assertThat(status.suggestConversion()).isTrue();
    }

    @Test
    @DisplayName("근무 이력이 아예 없는 사용자에게는 권유하지 않는다 — '퇴사하셨네요' 맥락이 성립하지 않는다")
    void userWithoutAnyEmploymentIsNotSuggested() {
        User user = new User("personalmode_none" + SEQ.incrementAndGet() + "@example.com", "무이력");
        user.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.saveAndFlush(user);
        employeeProfileRepository.save(new EmployeeProfile(user));

        var status = personalModeService.status(user.getId());

        assertThat(status.activeStoreCount()).isZero();
        assertThat(status.suggestConversion()).isFalse();
    }

    @Test
    @DisplayName("개인 모드를 켜도 계정 등급은 EMPLOYEE 그대로다 — 인증채용·증명서 접근 유지의 전제")
    void enablingPersonalModeDoesNotChangeUserGrade() throws Exception {
        User user = createEmployee(false, 10);

        consentService.recordPersonalModeConsent(user.getId(), true);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isPersonalModeEnabled()).isTrue();
        assertThat(reloaded.getUserGrade()).isEqualTo(UserGrade.EMPLOYEE);
    }

    @Test
    @DisplayName("전환 동의는 버전과 함께 이력으로 남는다")
    void consentIsRecordedWithVersion() throws Exception {
        User user = createEmployee(false, 10);

        consentService.recordPersonalModeConsent(user.getId(), true);

        assertThat(termsAgreementRepository.findAll())
                .filteredOn(a -> a.getTermsType() == TermsType.PERSONAL_MODE_CONVERSION)
                .isNotEmpty()
                .allSatisfy(a -> assertThat(a.getTermsVersion()).isEqualTo("personal-mode-v1.0"));
    }

    @Test
    @DisplayName("개인 모드를 끄면 기능만 꺼지고 최초 동의 시점은 이력으로 남는다")
    void disablingKeepsFirstAgreedAt() throws Exception {
        User user = createEmployee(false, 10);
        consentService.recordPersonalModeConsent(user.getId(), true);
        LocalDateTime firstAgreedAt = userRepository.findById(user.getId()).orElseThrow()
                .getPersonalModeAgreedAt();

        consentService.recordPersonalModeConsent(user.getId(), false);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isPersonalModeEnabled()).isFalse();
        assertThat(reloaded.getPersonalModeAgreedAt()).isEqualTo(firstAgreedAt);
    }

    @Test
    @DisplayName("이미 켠 상태에서 다시 동의해도 최초 동의 시점을 덮어쓰지 않는다")
    void reConsentDoesNotOverwriteFirstAgreedAt() throws Exception {
        User user = createEmployee(false, 10);
        consentService.recordPersonalModeConsent(user.getId(), true);
        LocalDateTime firstAgreedAt = userRepository.findById(user.getId()).orElseThrow()
                .getPersonalModeAgreedAt();

        consentService.recordPersonalModeConsent(user.getId(), true);

        assertThat(userRepository.findById(user.getId()).orElseThrow().getPersonalModeAgreedAt())
                .isEqualTo(firstAgreedAt);
    }
}
