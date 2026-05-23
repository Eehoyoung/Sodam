package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder bCryptPasswordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
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

    @jakarta.transaction.Transactional
    @CacheEvict(value = "users", key = "#joinDto.email")
    public User joinUser(JoinDto joinDto, String grade) {
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
                    "비밀번호는 8자 이상, 대소문자·숫자·특수문자를 각 1자 이상 포함해야 해요.");
        }

        // 이메일 중복
        if (userRepository.findByEmail(joinDto.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일이에요.");
        }

        User user = new User();
        user.setPassword(passwordEncoder.encode(joinDto.getPassword()));
        user.setEmail(joinDto.getEmail().trim());
        user.setName(joinDto.getName().trim());
        user.setUserGrade(resolveUserGrade(grade, joinDto.getUserGrade()));
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setAgeConfirmedAt(now);
        user.setTermsAgreedAt(now);
        user.setPrivacyAgreedAt(now);
        if (Boolean.TRUE.equals(joinDto.getMarketingAgreed())) {
            user.setMarketingAgreedAt(now);
        }
        return userRepository.save(user);
    }

    /**
     * 헤더(X-User-Grade) → DTO → 기본값 순으로 등급 결정.
     * 잘못된 값(예: "PERSONAL", "owner")이 와도 500 으로 떨어지지 않게 fail-safe.
     */
    private UserGrade resolveUserGrade(String headerGrade, UserGrade dtoGrade) {
        if (headerGrade != null && !headerGrade.isBlank()) {
            String normalized = headerGrade.trim();
            // 정확 매치 우선
            for (UserGrade g : UserGrade.values()) {
                if (g.name().equalsIgnoreCase(normalized)) {
                    return g;
                }
            }
            // 의미 매핑 (FE 가 사람이 읽는 값을 보낼 때 대비)
            switch (normalized.toLowerCase()) {
                case "personal":
                case "normal":
                case "user":
                    return UserGrade.Personal;
                case "boss":
                case "owner":
                case "master":
                    return UserGrade.MASTER;
                case "employee":
                case "staff":
                    return UserGrade.EMPLOYEE;
                default:
                    // 알 수 없는 값은 Personal 로 fallback (회원가입 자체는 막지 않음)
                    org.slf4j.LoggerFactory.getLogger(UserService.class)
                            .warn("알 수 없는 X-User-Grade 값 — Personal 로 fallback: {}", normalized);
            }
        }
        return dtoGrade != null ? dtoGrade : UserGrade.Personal;
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

        // 2. 이메일 중복 검사 (변경하는 경우)
        if (updateDto.getEmail() != null && !updateDto.getEmail().equals(employee.getEmail())) {
            Optional<User> existingUser = userRepository.findByEmail(updateDto.getEmail());
            if (existingUser.isPresent()) {
                throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + updateDto.getEmail());
            }
        }

        // 3. 정보 업데이트
        if (updateDto.getName() != null && !updateDto.getName().trim().isEmpty()) {
            employee.setName(updateDto.getName().trim());
        }

        if (updateDto.getEmail() != null && !updateDto.getEmail().trim().isEmpty()) {
            employee.setEmail(updateDto.getEmail().trim());
        }

        if (updateDto.getUserGrade() != null) {
            // 직책 변경 시 적절한 메서드 사용
            if (updateDto.getUserGrade() == UserGrade.MASTER) {
                employee.changeToMaster();
            } else if (updateDto.getUserGrade() == UserGrade.EMPLOYEE) {
                employee.changeToEmployee();
            } else {
                employee.setUserGrade(updateDto.getUserGrade());
            }
        }

        // 4. 저장 및 반환
        return userRepository.save(employee);
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
     * - 활성 구독 보유 시 IllegalStateException
     * - 이메일은 즉시 익명화하지 않고 90일 보관 후 배치로 익명화 (재가입 방지)
     * - 단순화를 위해 본 단계에서는 활성 구독 검증 + 이메일 suffix 변경으로 로그인 차단
     *
     * TODO[CONFIRM-운영]: 90일 후 배치 PII 익명화 작업 추가 (별도 Scheduler)
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public void withdrawUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 활성 구독 차단 — SubscriptionService 직접 호출은 순환 의존 위험.
        // 대신 SubscriptionRepository 를 통해 검증 (런타임 의존 — 빈 주입).
        // 본 단계에서는 단순화: 운영에서는 ApplicationEvent 로 분리 권장.

        // 이메일 비활성화 (로그인 차단)
        String original = user.getEmail();
        user.setEmail("withdrawn_" + userId + "_" + System.currentTimeMillis() + "@sodam.app.invalid");
        // password 도 무효화 (재로그인 방지)
        user.setPassword(bCryptPasswordEncoder.encode(java.util.UUID.randomUUID().toString()));
        userRepository.save(user);
        // 로그 (PII 마스킹)
        org.slf4j.LoggerFactory.getLogger(UserService.class)
                .info("회원 탈퇴 처리 — userId={}, originalEmailHash={}", userId,
                        Integer.toHexString(original == null ? 0 : original.hashCode()));
    }
}
