package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.SubscriptionStatus;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.core.consent.TermsVersions;
import com.rich.sodam.domain.TermsAgreement;
import com.rich.sodam.domain.type.TermsType;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.TermsAgreementRepository;
import com.rich.sodam.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    /** 탈퇴 후 PII 보관 기간(일) — 처리방침상 90일. */
    static final int PII_RETENTION_DAYS = 90;

    /** 탈퇴를 차단하는 "활성" 구독 상태 — 결제 진행/유효 기간 중. */
    private static final List<SubscriptionStatus> BLOCKING_SUBSCRIPTION_STATUSES = List.of(
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PENDING_PAYMENT,
            SubscriptionStatus.PAST_DUE);

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final TermsAgreementRepository termsAgreementRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder bCryptPasswordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    public UserService(UserRepository userRepository,
                       SubscriptionRepository subscriptionRepository,
                       TermsAgreementRepository termsAgreementRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.termsAgreementRepository = termsAgreementRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 사용자 목적을 기반으로 등급을 설정/갱신합니다.
     * - personal -> Personal (다운그레이드는 허용하지 않음)
     * - employee -> EMPLOYEE (NORMAL에서만 승격 허용)
     * - boss -> MASTER (NORMAL에서만 승격 허용)
     * 동일 등급 요청은 그대로 반환합니다.
     *
     * @param userId  대상 사용자 ID
     * @param purpose personal | employee | boss (대소문자 무시)
     * @return 갱신된 사용자
     */
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public User updatePurpose(Long userId, String purpose) {
        if (purpose == null || purpose.trim().isEmpty()) {
            throw new IllegalArgumentException("purpose 값이 비어있습니다.");
        }
        String p = purpose.trim().toLowerCase();
        UserGrade target;
        switch (p) {
            case "personal":
                target = UserGrade.Personal;
                break;
            case "employee":
                target = UserGrade.EMPLOYEE;
                break;
            case "boss":
                target = UserGrade.MASTER;
                break;
            default:
                throw new IllegalArgumentException("유효하지 않은 purpose 값입니다: " + purpose);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        // 동일 등급이면 변경 없이 반환
        if (user.getUserGrade() == target) {
            return user;
        }

        // NORMAL에서만 승격 허용, 다운그레이드는 금지
        if (target == UserGrade.EMPLOYEE || target == UserGrade.MASTER) {
            if (user.getUserGrade() != UserGrade.Personal) {
                throw new IllegalStateException("권한 승격은 Personal 등급에서만 가능합니다. 현재 등급: " + user.getUserGrade());
            }
            if (target == UserGrade.EMPLOYEE) {
                user.changeToEmployee();
            } else {
                user.changeToMaster();
            }
        } else { // target == Personal
            if (user.getUserGrade() != UserGrade.Personal) {
                throw new IllegalStateException("권한을 낮출 수 없습니다. 현재 등급: " + user.getUserGrade());
            }
            // 이미 NORMAL이 아니면 위에서 예외, 여기 도달 시 Personal 유지
        }

        return userRepository.save(user);
    }

    @Transactional
    public Optional<User> loadUserByLoginId(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPassword())) {
            return user;
        }
        return Optional.empty();
    }


    @Cacheable(value = "users", key = "#email")
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /** 이메일 중복 여부 — true 면 가입 가능. */
    public boolean isEmailAvailable(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return userRepository.findByEmail(email.trim().toLowerCase()).isEmpty();
    }

    @jakarta.transaction.Transactional
    @CacheEvict(value = "users", key = "#joinDto.email")
    public User joinUser(JoinDto joinDto) {
        if (joinDto == null) {
            throw new IllegalArgumentException("가입 요청이 비어 있어요.");
        }

        // 필수 동의 검증
        if (joinDto.getAgeConfirmed() == null || !joinDto.getAgeConfirmed()
                || joinDto.getTermsAgreed() == null || !joinDto.getTermsAgreed()
                || joinDto.getPrivacyAgreed() == null || !joinDto.getPrivacyAgreed()) {
            throw new IllegalArgumentException(
                    "이용약관·개인정보 처리방침·만 14세 이상 동의는 필수입니다.");
        }

        // 필수 필드 검증 (DB nullable=false 컬럼에 대한 가드 — DataIntegrityViolation 500 방지)
        if (joinDto.getEmail() == null || joinDto.getEmail().isBlank()) {
            throw new IllegalArgumentException("이메일은 필수입니다.");
        }
        if (joinDto.getName() == null || joinDto.getName().isBlank()) {
            throw new IllegalArgumentException("이름은 필수입니다.");
        }

        // 비밀번호 정책: PasswordResetService 와 동일 규칙
        if (!com.rich.sodam.service.PasswordResetService.isValidPassword(joinDto.getPassword())) {
            throw new IllegalArgumentException(
                    "비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자 중 3가지 이상을 포함해야 해요.");
        }

        // 이메일 중복
        if (userRepository.findByEmail(joinDto.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일이에요.");
        }

        User user = new User();
        user.setPassword(passwordEncoder.encode(joinDto.getPassword()));
        user.setEmail(joinDto.getEmail().trim());
        user.setName(joinDto.getName().trim());
        user.setUserGrade(resolvePublicSignupGrade(joinDto.getUserGrade()));
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setAgeConfirmedAt(now);
        user.setTermsAgreedAt(now);
        user.setPrivacyAgreedAt(now);
        boolean marketing = Boolean.TRUE.equals(joinDto.getMarketingAgreed());
        if (marketing) {
            user.setMarketingAgreedAt(now);
        }
        User saved = userRepository.save(user);

        // 동의 입증·버전관리용 이력 적재 (PIPA — 동의 사실·시점·버전 보존)
        recordAudit(saved.getId(), TermsType.AGE_14, true, now);
        recordAudit(saved.getId(), TermsType.TERMS_OF_SERVICE, true, now);
        recordAudit(saved.getId(), TermsType.PRIVACY_POLICY, true, now);
        recordAudit(saved.getId(), TermsType.MARKETING, marketing, now);
        return saved;
    }

    private void recordAudit(Long userId, TermsType type, boolean agreed, LocalDateTime at) {
        termsAgreementRepository.save(
                TermsAgreement.of(userId, type, TermsVersions.current(type), agreed, at));
    }

    /**
     * 공개 가입에서 만들 수 있는 계정 등급만 허용한다.
     * MANAGER/BOSSES는 매장-사용자 관계와 별도 승인 흐름으로만 부여해야 한다.
     */
    private UserGrade resolvePublicSignupGrade(UserGrade requestedGrade) {
        if (requestedGrade == null) {
            return UserGrade.Personal;
        }
        return switch (requestedGrade) {
            case Personal, EMPLOYEE, MASTER -> requestedGrade;
            case MANAGER, BOSSES -> throw new IllegalArgumentException(
                    "공개 회원가입으로 요청할 수 없는 사용자 등급입니다.");
        };
    }

    /**
     * 사용자를 사업주로 전환합니다.
     * AUTH-008: 사업주 전환 기능
     *
     * @param userId 전환할 사용자 ID
     * @return 전환된 사용자 정보
     * @throws IllegalArgumentException 사용자를 찾을 수 없거나 이미 사업주인 경우
     */
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public User convertToOwner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        // 이미 사업주(MASTER)인 경우 예외 처리
        if (user.getUserGrade() == UserGrade.MASTER) {
            throw new IllegalArgumentException("이미 사업주 권한을 가진 사용자입니다.");
        }

        // 일반 사용자만 사업주로 전환 가능
        if (user.getUserGrade() != UserGrade.Personal) {
            throw new IllegalArgumentException("일반 사용자만 사업주로 전환할 수 있습니다. 현재 등급: " + user.getUserGrade());
        }

        // 사업주로 전환
        user.changeToMaster();
        return userRepository.save(user);
    }

    /**
     * 사용자 ID로 사용자 조회
     *
     * @param userId 사용자 ID
     * @return 사용자 정보
     */
    @Cacheable(value = "users", key = "#userId")
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * 사용자가 사업주(MASTER) 권한을 가지고 있는지 확인
     *
     * @param userId 확인할 사용자 ID
     * @return 사업주 권한 여부
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     */
    @Cacheable(value = "users", key = "'master:' + #userId")
    public boolean isMaster(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        return user.getUserGrade() == UserGrade.MASTER;
    }

    /**
     * 사업주 권한 검증 (예외 발생)
     *
     * @param userId 확인할 사용자 ID
     * @throws IllegalArgumentException 사용자를 찾을 수 없거나 사업주가 아닌 경우
     */
    public void validateMasterPermission(Long userId) {
        if (!isMaster(userId)) {
            throw new IllegalArgumentException("사업주 권한이 필요합니다. 사용자 ID: " + userId);
        }
    }

    /**
     * 직원 정보 수정
     * STORE-012: 직원 기본 정보, 직책 등 수정
     *
     * @param employeeId 수정할 직원 ID
     * @param updateDto  수정할 정보
     * @return 수정된 사용자 정보
     * @throws IllegalArgumentException 직원을 찾을 수 없거나 권한이 없는 경우
     */
    @Transactional
    @CacheEvict(value = "users", key = "#employeeId")
    public User updateEmployeeInfo(Long employeeId, EmployeeUpdateDto updateDto) {
        // 1. 직원 존재 여부 확인
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("직원을 찾을 수 없습니다. ID: " + employeeId));

        // 로그인 이메일은 직원 관리 API에서 변경할 수 없다.
        // 변경은 본인 재인증과 새 이메일 검증을 거치는 전용 흐름에서만 허용한다.
        if (updateDto.getEmail() != null && !updateDto.getEmail().equals(employee.getEmail())) {
            throw new IllegalArgumentException("직원 관리 화면에서는 로그인 이메일을 변경할 수 없어요.");
        }

        // 3. 정보 업데이트
        if (updateDto.getName() != null && !updateDto.getName().trim().isEmpty()) {
            employee.setName(updateDto.getName().trim());
        }

        if (updateDto.getUserGrade() != null && updateDto.getUserGrade() != employee.getUserGrade()) {
            throw new IllegalArgumentException("직원 관리 화면에서는 전역 사용자 등급을 변경할 수 없어요.");
        }

        // 4. 저장 및 반환
        return userRepository.save(employee);
    }

    /**
     * 프로필 기본정보 보강 (회원가입 후 첫 로그인 직후 호출).
     * - phone(필수, 숫자만 저장) + name 갱신(선택) + birthDate(선택)
     * - 완료 시 profile_completed_at 마킹 → FE 가 본 화면 우회
     * - phone 형식 검증은 DTO @Pattern 에서 1차, 도메인 메서드에서 2차.
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public User completeProfileBasics(Long userId, String phone, String name, java.time.LocalDate birthDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없어요."));
        if (name != null && !name.isBlank()) {
            String trimmed = name.trim();
            if (trimmed.length() < 2 || trimmed.length() > 50) {
                throw new IllegalArgumentException("이름은 2~50자 사이여야 해요.");
            }
        }
        user.completeProfile(phone, name, birthDate);
        return userRepository.save(user);
    }

    /**
     * 본인 기본 정보(이름) 변경. 셀프.
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public User updateBasicInfo(Long userId, String name) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없어요."));
        if (name != null && !name.isBlank()) {
            String trimmed = name.trim();
            if (trimmed.length() < 2 || trimmed.length() > 50) {
                throw new IllegalArgumentException("이름은 2~50자 사이여야 해요.");
            }
            user.setName(trimmed);
        }
        return userRepository.save(user);
    }

    /**
     * 회원 탈퇴 처리 (PRD_OWNER A5).
     * - 활성 구독(ACTIVE/PENDING_PAYMENT/PAST_DUE) 보유 시 IllegalStateException (W-1)
     *   → 컨트롤러가 ACTIVE_SUBSCRIPTION 으로 분기. 환불/해지는 본 메서드에서 처리하지 않음(결제 인접).
     * - 이메일/비밀번호 즉시 무효화로 로그인 차단.
     * - PII(phone/birthDate/name)는 즉시 파기하지 않고 withdrawnAt 마킹 후
     *   90일 경과분을 UserDataRetentionScheduler 배치가 익명화 (PIPA §21, 재가입/분쟁 대비 보관).
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public void withdrawUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // W-1: 활성 구독 차단 — SubscriptionService 직접 호출은 순환 의존 위험이라 Repository 로 검증.
        // 차단만 수행, 환불/취소는 결제 인접 작업이므로 여기서 건드리지 않음.
        Optional<com.rich.sodam.domain.Subscription> activeSub =
                subscriptionRepository.findFirstByUser_IdAndStatusIn(userId, BLOCKING_SUBSCRIPTION_STATUSES);
        if (activeSub.isPresent()) {
            throw new IllegalStateException("활성 구독이 있어 탈퇴할 수 없습니다. 먼저 구독을 해지해 주세요.");
        }

        // 탈퇴 시점 마킹 (90일 PII 파기 기산점)
        user.markWithdrawn();

        // 이메일 비활성화 (로그인 차단)
        String original = user.getEmail();
        user.setEmail("withdrawn_" + userId + "_" + System.currentTimeMillis() + "@sodam.app.invalid");
        // password 도 무효화 (재로그인 방지)
        user.setPassword(bCryptPasswordEncoder.encode(java.util.UUID.randomUUID().toString()));
        userRepository.save(user);
        // 로그 (PII 마스킹 — 원문 이메일은 해시만)
        org.slf4j.LoggerFactory.getLogger(UserService.class)
                .info("회원 탈퇴 처리 — userId={}, originalEmailHash={}", userId,
                        Integer.toHexString(original == null ? 0 : original.hashCode()));
    }

    /**
     * 탈퇴 후 보관기간(90일) 경과 사용자의 PII 익명화 (PIPA §21).
     * UserDataRetentionScheduler 배치에서 호출. 멱등(이미 익명화된 행은 쿼리에서 제외).
     *
     * @return 익명화 처리 건수
     */
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public int anonymizeExpiredWithdrawnUsers() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(PII_RETENTION_DAYS);
        List<User> targets = userRepository.findWithdrawnDueForAnonymization(threshold);
        for (User user : targets) {
            user.anonymizePii();
        }
        if (!targets.isEmpty()) {
            userRepository.saveAll(targets);
        }
        return targets.size();
    }
}
